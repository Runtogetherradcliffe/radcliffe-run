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
// tables, columns, indexes, constraints, RLS-enabled flags, RLS policies and
// GRANTs to anon/authenticated/PUBLIC.
// It exits non-zero when drift is found, so it can gate a scheduled run or CI.
//
// GRANTS (added 17 Jul 2026). The 16 Jul privilege-escalation fix REVOKEd every
// write verb on `members` from authenticated and anon, so the property "a member
// cannot make themselves a run leader and read the club's medical PII" now rests
// ENTIRELY on column/table grants. This tool was blind to them, and the named
// guard (tests/access) is excluded from CI, needs the service key and a live
// site, WRITES test rows, and defaults to dev - so it could never watch prod
// anyway. db-diff is the only read-only mechanism that is safe to point at
// production routinely, which is why the grants live here. Two checks, because
// they answer different questions:
//   * the `grants` diff category  - have the two projects drifted apart?
//   * the write-lockdown ALARM    - is either project wrong against INTENT?
//     (Both can be identically wrong; they were, before 16 Jul.)
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
// NOTE (17 Jul 2026): these two vars are NOT part of the app's runtime env -
// nothing in the site reads them, so a working .env.local (service-role key,
// Supabase URL, Brevo, etc.) does NOT imply db-diff can run, and on this machine
// it could not: .env.local had never carried them. Add them deliberately, or
// export them for the run. A fresh clone or git worktree has no .env.local at all
// (gitignored, and worktrees only materialise tracked files), so the same applies
// there. The failure mode is the "missing connection strings" fail() below.
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

  // "table [grantee]" -> "INSERT=ALL | SELECT=(col,col)"
  //
  // WHY THIS CATEGORY EXISTS (16 Jul 2026): the privilege-escalation fix
  // (supabase-migration-members-write-lockdown.sql) REVOKEd every write verb on
  // `members` from authenticated and anon. Postgres RLS cannot restrict which
  // COLUMNS are written, so after that fix the security property "a member
  // cannot set their own is_run_leader=true" lives ENTIRELY in these GRANTs -
  // and this tool could not see them. The two projects are applied BY HAND, so
  // hand-applied grants are exactly the drift category db-diff exists for.
  //
  // Read from pg_catalog (relacl = table-level ACL, attacl = column-level), NOT
  // information_schema. Three reasons, all verified against the live projects on
  // 17 Jul 2026:
  //
  // 1. column_privileges CANNOT SEE HALF THE VERBS. Only SELECT/INSERT/UPDATE/
  //    REFERENCES can be column-scoped at all, so those are the only four that
  //    view can ever contain - across the whole public schema it returns exactly
  //    that set. DELETE, TRUNCATE and TRIGGER are table-level only and are
  //    structurally absent from it. This is not academic: it is why TRUNCATE on
  //    members went unnoticed during the 16 Jul review, which read
  //    column_privileges and concluded "SELECT only". (The conclusion held -
  //    DELETE really is revoked - but the evidence could not have shown
  //    otherwise.) A guard built on that view would inherit the same blind spot
  //    over the exact verbs it exists to watch.
  // 2. Even table_privileges is incomplete: it omits MAINTAIN (new in PG17), which
  //    the SQL-standard views do not model. aclexplode reports it.
  // 3. column_privileges expands a table-wide grant into one row per column, so it
  //    cannot tell a table-wide GRANT from one scoped to every column. Here a
  //    table-wide grant reads `=ALL` and a column-scoped one lists its columns.
  //
  // (It is also filtered to the current user's grants; the catalogs are not.)
  //
  // PUBLIC is included alongside anon/authenticated: a grant to PUBLIC reaches
  // both roles implicitly, so watching only the two named roles would miss it.
  grants: {
    sql: `
      select c.relname as table_name,
             case when a.grantee = 0 then 'PUBLIC'
                  else pg_get_userbyid(a.grantee)::text end as grantee,
             a.privilege_type,
             null::text as column_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(c.relacl) a
      where n.nspname = 'public' and c.relkind in ('r','v','m','p')
        and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon','authenticated'))
      union all
      select c.relname as table_name,
             case when a.grantee = 0 then 'PUBLIC'
                  else pg_get_userbyid(a.grantee)::text end as grantee,
             a.privilege_type,
             att.attname::text as column_name
      from pg_attribute att
      join pg_class c     on c.oid = att.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(att.attacl) a
      where n.nspname = 'public' and c.relkind in ('r','v','m','p')
        and att.attnum > 0 and not att.attisdropped
        and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon','authenticated'))
      order by table_name, grantee, privilege_type, column_name`,
    // Aggregated in JS rather than SQL so the shaping is unit-testable with no DB
    // and no credentials, like the rest of this file's helpers.
    fold: foldGrants,
    label: 'Grants to anon / authenticated / PUBLIC',
  },

  // table.policy -> "cmd=.. roles=.. permissive=.. qual=.. check=.."
  policies: {
    sql: `
      select tablename as table_name,
             policyname as policy_name,
             permissive,
             roles::text[] as roles,
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
        `roles={${toRoleArray(r.roles).sort().join(',')}}`,
        `qual=${normalizeSql(r.qual)}`,
        `with_check=${normalizeSql(r.with_check)}`,
      ].join(' | '),
    label: 'RLS policies',
  },
}

function contype(t) {
  return { p: 'PRIMARY KEY', u: 'UNIQUE', c: 'CHECK', f: 'FOREIGN KEY' }[t] ?? t
}

// pg_policies.roles is name[] (OID 1003), and node-postgres registers NO parser
// for it - it hands back the raw Postgres literal "{anon,authenticated}" as a
// STRING, not an array. `(r.roles ?? []).slice().sort()` therefore threw
// "sort is not a function" and took the WHOLE tool down (the error is caught in
// main() as "could not connect / query", which reads like a connection fault and
// hides the real cause). Found 17 Jul 2026 on the first end-to-end run this
// machine has ever done; the unit test passed throughout because it fed value()
// a real JS array, an assumption about the driver the driver never honoured.
//
// The SQL now casts roles to text[] (OID 1009), which pg DOES parse, so this
// normally receives an array. It stays tolerant of the raw-string form so a
// driver or cast change degrades to correct output instead of a crash.
function toRoleArray(v) {
  if (Array.isArray(v)) return v.slice()
  if (typeof v === 'string') {
    return v
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  }
  return []
}

// ── grants ──────────────────────────────────────────────────────────────────
// Collapse the raw acl rows into one readable line per table+grantee:
//
//   members [anon]           SELECT=ALL
//   members [authenticated]  SELECT=ALL | UPDATE=(is_run_leader)
//
// A table-wide grant (column_name null) subsumes any column-scoped grant of the
// same privilege - it already permits every column - so it renders `=ALL` and the
// column list is dropped. That is the effective privilege, which is what a
// security check cares about.
function foldGrants(rows) {
  // table -> grantee -> privilege -> { tableWide, cols:Set }
  const byKey = new Map()
  for (const r of rows) {
    const key = `${r.table_name} [${r.grantee}]`
    if (!byKey.has(key)) byKey.set(key, new Map())
    const privs = byKey.get(key)
    if (!privs.has(r.privilege_type)) privs.set(r.privilege_type, { tableWide: false, cols: new Set() })
    const p = privs.get(r.privilege_type)
    if (r.column_name == null) p.tableWide = true
    else p.cols.add(r.column_name)
  }
  const out = new Map()
  for (const [key, privs] of [...byKey].sort((a, b) => a[0].localeCompare(b[0]))) {
    const parts = [...privs.keys()]
      .sort()
      .map((name) => {
        const p = privs.get(name)
        const scope = p.tableWide ? 'ALL' : `(${[...p.cols].sort().join(',')})`
        return `${name}=${scope}`
      })
    out.set(key, parts.join(' | '))
  }
  return out
}

// ── the write-lockdown alarm ────────────────────────────────────────────────
// Drift between the two projects is only half the question. Both projects can be
// identically WRONG - they were, before 16 Jul 2026, when authenticated held a
// table-wide UPDATE on members on dev AND prod and the diff would have said "no
// drift". So these tables are also checked against INTENT, per project, and a
// finding is raised whether or not the two agree.
//
// Deliberately NARROW. Every table in `public` carries broad default grants from
// Supabase, and most are inert (held back only by the absence of a policy).
// Alarming on all of them would bury a real regression in noise, which is the
// failure this check exists to prevent. `members` is the table the lockdown
// closed and the one holding the club's emergency/medical PII. Add a table here
// only when its writes are genuinely service-role-only by design.
const WRITE_LOCKED_TABLES = ['members']

// INSERT/UPDATE/DELETE only, and the exclusions are deliberate. Verified against
// both live projects 17 Jul 2026:
//
//   * TRUNCATE, MAINTAIN, REFERENCES, TRIGGER are granted to anon AND
//     authenticated on 16 of 16 public tables, members included - that is
//     Supabase's default posture for every table, not a decision anyone made
//     here. Alarming on them would fire on a CORRECT database, for ever, which
//     is the cry-wolf failure that hides a real regression.
//   * INSERT/UPDATE/DELETE are granted on 15 of 16 tables; `members` is the one
//     exception. That is the 16 Jul lockdown, visible in the data - which is
//     exactly what makes these three verbs the right alarm.
//
// TRUNCATE is worth knowing about rather than acting on: RLS does not gate it,
// so it is held back only by PostgREST exposing no TRUNCATE verb - inert by
// absence of an interface, not by policy. It stays visible in the watched-grant
// lines below rather than being alarmed on.
const WRITE_PRIVILEGES = new Set(['INSERT', 'UPDATE', 'DELETE'])
const EXPOSED_ROLES = new Set(['anon', 'authenticated', 'PUBLIC'])

// A write grant held by a role the public anon key can reach. Returns one finding
// per (table, grantee, privilege), each already a printable sentence.
function grantAlarms(rows) {
  const seen = new Map()
  for (const r of rows) {
    if (!WRITE_LOCKED_TABLES.includes(r.table_name)) continue
    if (!EXPOSED_ROLES.has(r.grantee)) continue
    if (!WRITE_PRIVILEGES.has(r.privilege_type)) continue
    const key = `${r.table_name} [${r.grantee}] ${r.privilege_type}`
    if (!seen.has(key)) seen.set(key, { key, table: r.table_name, grantee: r.grantee, privilege: r.privilege_type, columns: new Set() })
    if (r.column_name != null) seen.get(key).columns.add(r.column_name)
  }
  return [...seen.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((f) => ({
      key: f.key,
      table: f.table,
      grantee: f.grantee,
      privilege: f.privilege,
      scope: f.columns.size ? `columns (${[...f.columns].sort().join(',')})` : 'all columns',
    }))
}

// The grants actually held on the watched tables, printed even when clean.
// `anon` still holds SELECT on all 25 columns of members. That is inert today -
// no anon SELECT policy exists - but it is the same shape as the bug that just
// bit: a broad grant held back only by the absence of a policy. If anyone adds an
// anon SELECT policy for a public page, emergency_phone and medical_info go with
// it. Showing the line keeps that visible rather than merely absent.
function watchedGrantLines(grantsMap) {
  return [...grantsMap]
    .filter(([key]) => WRITE_LOCKED_TABLES.some((t) => key.startsWith(`${t} [`)))
    .sort((a, b) => a[0].localeCompare(b[0]))
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
    const maps = {}
    const raw = {}
    for (const [name, q] of Object.entries(QUERIES)) {
      const { rows } = await client.query(q.sql)
      raw[name] = rows
      if (q.fold) {
        // Category aggregates many rows into one entry (see foldGrants).
        maps[name] = q.fold(rows)
      } else {
        const map = new Map()
        for (const row of rows) map.set(q.key(row), q.value(row))
        maps[name] = map
      }
    }
    return { maps, raw }
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
    const d = diffMaps(dev.maps[name], prod.maps[name])
    report[name] = d
    totalDrift += d.count
  }

  // Intent check, per project - independent of whether the two agree.
  const alarms = {
    dev: grantAlarms(dev.raw.grants),
    prod: grantAlarms(prod.raw.grants),
  }
  const totalAlarms = alarms.dev.length + alarms.prod.length

  if (AS_JSON) {
    // Maps do not serialise; the diff arrays already hold plain objects.
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          devRef: DEV_REF,
          prodRef: PROD_REF,
          totalDrift,
          totalAlarms,
          categories: report,
          writeLockdownAlarms: alarms,
          watchedGrants: {
            dev: Object.fromEntries(watchedGrantLines(dev.maps.grants)),
            prod: Object.fromEntries(watchedGrantLines(prod.maps.grants)),
          },
        },
        null,
        2,
      ),
    )
    process.exit(totalDrift + totalAlarms > 0 ? 1 : 0)
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

  // ── write-lockdown alarm (per project, not a diff) ─────────────────────────
  console.log(`\n${'-'.repeat(78)}`)
  if (totalAlarms === 0) {
    console.log(`[ok] Write lockdown: no write grants to anon/authenticated/PUBLIC on ${WRITE_LOCKED_TABLES.join(', ')}`)
  } else {
    console.log(`[ALARM] Write lockdown breached: ${totalAlarms} grant(s) that must not exist`)
    for (const [proj, findings] of Object.entries(alarms)) {
      for (const f of findings) {
        console.log(`  ${proj.padEnd(5)} ${f.table} [${f.grantee}] holds ${f.privilege} on ${f.scope}`)
      }
    }
    console.log('  -> A member could write this table straight to PostgREST with the public')
    console.log('     anon key. Re-apply supabase-migration-members-write-lockdown.sql.')
  }

  // Current grants on the watched tables, shown even when clean (see the comment
  // on watchedGrantLines: a broad SELECT is one policy away from an exposure).
  for (const [proj, snap] of [['dev', dev], ['prod', prod]]) {
    for (const [key, value] of watchedGrantLines(snap.maps.grants)) {
      console.log(`  ${proj.padEnd(5)} ${key} ${value}`)
    }
  }

  console.log(`\n${line}`)
  if (totalDrift === 0 && totalAlarms === 0) {
    console.log('RESULT: dev and prod match. No drift, no privilege alarms.')
    console.log(line)
    process.exit(0)
  }
  if (totalDrift > 0) {
    console.log(`RESULT: ${totalDrift} drift(s) found. Reconcile via supabase-rls-baseline.sql`)
    console.log('        (RLS/grants) or by hand (schema), then apply to BOTH projects.')
  }
  if (totalAlarms > 0) {
    console.log(`        ${totalAlarms} privilege ALARM(s) - see above. These do not depend on`)
    console.log('        drift: both projects can be identically wrong.')
  }
  console.log(line)
  process.exit(1)
}

// Pure helpers exported for unit testing (scripts/db-diff.test.mjs). Importing
// the module must not connect or exit - only direct execution runs main().
export {
  QUERIES,
  contype,
  normalizeSql,
  diffMaps,
  toRoleArray,
  foldGrants,
  grantAlarms,
  watchedGrantLines,
  WRITE_LOCKED_TABLES,
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main().catch((e) => fail(e.message))
}
