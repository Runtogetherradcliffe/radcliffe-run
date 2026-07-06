#!/usr/bin/env node
// ============================================================================
// db-diff - dev vs production Supabase schema/RLS drift detector
// ============================================================================
// WHY: RLS policies, tables, columns, indexes and constraints are applied to
// the two Supabase projects BY HAND (there is no migration pipeline), so they
// silently drift. On 5 Jul 2026 the dev `members` self-access policy was found
// to be the broken `auth.uid() = id` form while production correctly used
// `auth.email() = email`, plus dev had extra roundup tables and a missing
// unique constraint. That was all reconciled (supabase-rls-baseline.sql is the
// versioned source of truth), but nothing DETECTS future drift. This does.
//
// It connects to BOTH projects read-only, introspects the `public` schema from
// pg_catalog / information_schema / pg_policies, and reports every difference in
// tables, columns, indexes, constraints, RLS-enabled flags and RLS policies.
// It exits non-zero when drift is found, so it can gate a scheduled run or CI.
//
// This is READ-ONLY tooling. It creates no objects and changes no data. See
// tests/access/README.md for the "how to run" section and supabase-rls-baseline.sql
// for the canonical RLS state this guards.
//
// CONNECTION (see the README): the Supabase service-role key + JS client can
// only read `public` tables via PostgREST - it cannot query the catalogs. So we
// use a direct Postgres connection string per project. Provide them as env vars
// (never hardcode the prod one):
//
//   DBDIFF_DEV_DB_URL   dev  project  (ref rnbiqxhlqjbahgiwabuv)
//   DBDIFF_PROD_DB_URL   prod project  (ref qpdymxagloeghypntpct)
//
// Grab each from the Supabase dashboard: Project settings -> Database ->
// Connection string -> "Session pooler" (or the direct connection). Both may be
// stored in the gitignored .env.local so `npm run db-diff` just works; a real
// process env var takes precedence over .env.local.
//
// Flags / env:
//   DBDIFF_JSON=1        emit a machine-readable JSON report instead of text
//                        (used by the scheduled drift alert)
//   DBDIFF_NO_SSL=1      disable TLS (local Postgres only; Supabase needs TLS)
// ============================================================================

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEV_REF = 'rnbiqxhlqjbahgiwabuv'
const PROD_REF = 'qpdymxagloeghypntpct'

// ── env loading ─────────────────────────────────────────────────────────────
// Merge .env.local (gitignored) under the real process env, so a shell export
// always wins but the connection strings can also live in .env.local.
function loadEnvLocal() {
  const out = {}
  try {
    const raw = readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // no .env.local - the env vars must supply everything
  }
  return out
}

function fail(msg) {
  console.error(`db-diff: ${msg}`)
  process.exit(2)
}

// Resolve + validate the two connection strings. Kept out of module scope so the
// pure helpers below can be imported and unit-tested without touching env/exit.
function resolveConfig() {
  const envFile = loadEnvLocal()
  const env = (k) => process.env[k] ?? envFile[k]
  const DEV_URL = env('DBDIFF_DEV_DB_URL')
  const PROD_URL = env('DBDIFF_PROD_DB_URL')

  if (!DEV_URL || !PROD_URL) {
    fail(
      'missing connection strings. Set DBDIFF_DEV_DB_URL and DBDIFF_PROD_DB_URL ' +
        '(env var or .env.local). Get them from Supabase dashboard -> Project ' +
        'settings -> Database -> Connection string (Session pooler).',
    )
  }
  // Guard against a swapped/duplicated paste: comparing prod against itself would
  // silently report "no drift". Each URL must reference its own project ref.
  if (DEV_URL.includes(PROD_REF) || PROD_URL.includes(DEV_REF)) {
    fail('the dev and prod connection strings look swapped (project ref mismatch). Refusing to run.')
  }
  if (!DEV_URL.includes(DEV_REF)) {
    console.error(`db-diff: warning - DBDIFF_DEV_DB_URL does not contain the dev ref ${DEV_REF}`)
  }
  if (!PROD_URL.includes(PROD_REF)) {
    console.error(`db-diff: warning - DBDIFF_PROD_DB_URL does not contain the prod ref ${PROD_REF}`)
  }
  return {
    DEV_URL,
    PROD_URL,
    AS_JSON: env('DBDIFF_JSON') === '1',
    USE_SSL: env('DBDIFF_NO_SSL') !== '1',
  }
}

// ── introspection queries (public schema, read-only) ────────────────────────
const QUERIES = {
  // table_name -> present
  tables: {
    sql: `
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
    key: (r) => r.table_name,
    value: () => 'present',
    label: 'Tables',
  },

  // table_name -> "rls=<bool> forced=<bool>"
  rls: {
    sql: `
      select c.relname as table_name,
             c.relrowsecurity  as rls_enabled,
             c.relforcerowsecurity as rls_forced
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by c.relname`,
    key: (r) => r.table_name,
    value: (r) => `rls_enabled=${r.rls_enabled} rls_forced=${r.rls_forced}`,
    label: 'RLS enabled per table',
  },

  // table.column -> "<type> | null=<bool> | default=<expr>"
  columns: {
    sql: `
      select c.relname as table_name,
             a.attname  as column_name,
             format_type(a.atttypid, a.atttypmod) as data_type,
             a.attnotnull as not_null,
             pg_get_expr(d.adbin, d.adrelid) as column_default
      from pg_attribute a
      join pg_class c     on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public' and c.relkind = 'r'
        and a.attnum > 0 and not a.attisdropped
      order by c.relname, a.attnum`,
    key: (r) => `${r.table_name}.${r.column_name}`,
    value: (r) =>
      `${r.data_type} | nullable=${!r.not_null} | default=${r.column_default ?? '(none)'}`,
    label: 'Columns',
  },

  // table.index -> full CREATE INDEX definition
  indexes: {
    sql: `
      select tablename as table_name, indexname as index_name, indexdef
      from pg_indexes
      where schemaname = 'public'
      order by tablename, indexname`,
    key: (r) => `${r.table_name}.${r.index_name}`,
    value: (r) => normalizeSql(r.indexdef),
    label: 'Indexes',
  },

  // table.constraint -> "<type>: <definition>"  (unique / check / FK / PK only)
  constraints: {
    sql: `
      select t.relname as table_name,
             c.conname  as constraint_name,
             c.contype,
             pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      join pg_class t     on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and c.contype in ('p','u','c','f')
      order by t.relname, c.conname`,
    key: (r) => `${r.table_name}.${r.constraint_name}`,
    value: (r) => `${contype(r.contype)}: ${normalizeSql(r.def)}`,
    label: 'Constraints (PK / unique / check / FK)',
  },

  // table.policy -> "cmd=.. roles=.. permissive=.. qual=.. check=.."
  policies: {
    sql: `
      select tablename as table_name,
             policyname as policy_name,
             permissive,
             roles,
             cmd,
             qual,
             with_check
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname`,
    key: (r) => `${r.table_name}.${r.policy_name}`,
    value: (r) =>
      [
        `cmd=${r.cmd}`,
        `permissive=${r.permissive}`,
        `roles={${(r.roles ?? []).slice().sort().join(',')}}`,
        `qual=${normalizeSql(r.qual)}`,
        `with_check=${normalizeSql(r.with_check)}`,
      ].join(' | '),
    label: 'RLS policies',
  },
}

function contype(t) {
  return { p: 'PRIMARY KEY', u: 'UNIQUE', c: 'CHECK', f: 'FOREIGN KEY' }[t] ?? t
}

// Collapse whitespace so cosmetic formatting differences do not read as drift.
function normalizeSql(s) {
  if (s == null) return '(none)'
  return String(s).replace(/\s+/g, ' ').trim()
}

// ── run ─────────────────────────────────────────────────────────────────────
async function snapshot(connectionString, useSsl) {
  const client = new Client({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    statement_timeout: 30_000,
  })
  await client.connect()
  try {
    // Belt and braces: this session cannot write even if a query tried to.
    await client.query('set session characteristics as transaction read only')
    const result = {}
    for (const [name, q] of Object.entries(QUERIES)) {
      const { rows } = await client.query(q.sql)
      const map = new Map()
      for (const row of rows) map.set(q.key(row), q.value(row))
      result[name] = map
    }
    return result
  } finally {
    await client.end()
  }
}

function diffMaps(devMap, prodMap) {
  const devOnly = []
  const prodOnly = []
  const differing = []
  for (const [k, v] of devMap) {
    if (!prodMap.has(k)) devOnly.push({ key: k, dev: v })
    else if (prodMap.get(k) !== v) differing.push({ key: k, dev: v, prod: prodMap.get(k) })
  }
  for (const [k, v] of prodMap) {
    if (!devMap.has(k)) prodOnly.push({ key: k, prod: v })
  }
  const sort = (a, b) => a.key.localeCompare(b.key)
  return {
    devOnly: devOnly.sort(sort),
    prodOnly: prodOnly.sort(sort),
    differing: differing.sort(sort),
    count: devOnly.length + prodOnly.length + differing.length,
  }
}

async function main() {
  const { DEV_URL, PROD_URL, AS_JSON, USE_SSL } = resolveConfig()
  let dev, prod
  try {
    ;[dev, prod] = await Promise.all([snapshot(DEV_URL, USE_SSL), snapshot(PROD_URL, USE_SSL)])
  } catch (e) {
    fail(`could not connect / query: ${e.message}`)
  }

  const report = {}
  let totalDrift = 0
  for (const name of Object.keys(QUERIES)) {
    const d = diffMaps(dev[name], prod[name])
    report[name] = d
    totalDrift += d.count
  }

  if (AS_JSON) {
    // Maps do not serialise; the diff arrays already hold plain objects.
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          devRef: DEV_REF,
          prodRef: PROD_REF,
          totalDrift,
          categories: report,
        },
        null,
        2,
      ),
    )
    process.exit(totalDrift > 0 ? 1 : 0)
  }

  // ── text report ────────────────────────────────────────────────────────────
  const line = '='.repeat(78)
  console.log(line)
  console.log('Supabase dev/prod drift report')
  console.log(`  dev  = ${DEV_REF}   prod = ${PROD_REF}`)
  console.log(`  ${new Date().toISOString()}`)
  console.log(line)

  for (const name of Object.keys(QUERIES)) {
    const q = QUERIES[name]
    const d = report[name]
    if (d.count === 0) {
      console.log(`\n[ok] ${q.label}: no drift`)
      continue
    }
    console.log(`\n[DRIFT] ${q.label}: ${d.count} difference(s)`)
    for (const x of d.devOnly) {
      console.log(`  dev-only    ${x.key}`)
      console.log(`                -> ${x.dev}`)
    }
    for (const x of d.prodOnly) {
      console.log(`  prod-only   ${x.key}`)
      console.log(`                -> ${x.prod}`)
    }
    for (const x of d.differing) {
      console.log(`  differs     ${x.key}`)
      console.log(`                dev : ${x.dev}`)
      console.log(`                prod: ${x.prod}`)
    }
  }

  console.log(`\n${line}`)
  if (totalDrift === 0) {
    console.log('RESULT: dev and prod match. No drift.')
    console.log(line)
    process.exit(0)
  }
  console.log(`RESULT: ${totalDrift} drift(s) found. Reconcile via supabase-rls-baseline.sql`)
  console.log('        (RLS) or by hand (schema), then apply to BOTH projects.')
  console.log(line)
  process.exit(1)
}

// Pure helpers exported for unit testing (scripts/db-diff.test.mjs). Importing
// the module must not connect or exit - only direct execution runs main().
export { QUERIES, contype, normalizeSql, diffMaps }

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main().catch((e) => fail(e.message))
}
