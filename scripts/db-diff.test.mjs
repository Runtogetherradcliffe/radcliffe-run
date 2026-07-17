// Unit tests for the pure diff/introspection helpers in db-diff.mjs.
// These do NOT touch a database - they verify the categorisation, normalisation
// and value-formatting logic that turns two catalog snapshots into a drift
// report. Run: npm run db-diff:test   (node's test runner, no DB, no creds).
// Deliberately NOT under tests/ so it stays out of the default `npm test` / CI
// glob - db-diff is opt-in tooling that needs live credentials to run for real.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  QUERIES,
  contype,
  normalizeSql,
  diffMaps,
  toRoleArray,
  foldGrants,
  grantAlarms,
  watchedGrantLines,
} from './db-diff.mjs'

// Shorthand for an acl row as the grants query returns it. column_name null =
// a table-wide grant; a string = a column-scoped one.
const acl = (table_name, grantee, privilege_type, column_name = null) => ({
  table_name,
  grantee,
  privilege_type,
  column_name,
})

test('normalizeSql collapses whitespace and handles null', () => {
  assert.equal(normalizeSql('  a   b\n c '), 'a b c')
  assert.equal(normalizeSql(null), '(none)')
})

test('contype maps the four tracked constraint types', () => {
  assert.equal(contype('p'), 'PRIMARY KEY')
  assert.equal(contype('u'), 'UNIQUE')
  assert.equal(contype('c'), 'CHECK')
  assert.equal(contype('f'), 'FOREIGN KEY')
})

test('diffMaps finds dev-only, prod-only and differing keys', () => {
  const dev = new Map([
    ['same', 'v'],
    ['onlyDev', 'x'],
    ['changed', 'devval'],
  ])
  const prod = new Map([
    ['same', 'v'],
    ['onlyProd', 'y'],
    ['changed', 'prodval'],
  ])
  const d = diffMaps(dev, prod)
  assert.equal(d.count, 3)
  assert.deepEqual(d.devOnly, [{ key: 'onlyDev', dev: 'x' }])
  assert.deepEqual(d.prodOnly, [{ key: 'onlyProd', prod: 'y' }])
  assert.deepEqual(d.differing, [{ key: 'changed', dev: 'devval', prod: 'prodval' }])
})

test('diffMaps reports zero drift for identical snapshots', () => {
  const a = new Map([['t.c', 'text | nullable=false | default=(none)']])
  const b = new Map([['t.c', 'text | nullable=false | default=(none)']])
  assert.equal(diffMaps(a, b).count, 0)
})

test('toRoleArray handles the raw name[] literal pg actually returns', () => {
  // The regression that broke the whole tool: node-postgres has no parser for
  // name[] (OID 1003) and returns the Postgres literal as a STRING. The old code
  // did (r.roles ?? []).slice().sort() and threw "sort is not a function",
  // surfacing as "could not connect / query" - so db-diff died on every run.
  assert.deepEqual(toRoleArray('{anon,authenticated}'), ['anon', 'authenticated'])
  assert.deepEqual(toRoleArray('{anon}'), ['anon'])
  assert.deepEqual(toRoleArray('{}'), [])
  assert.deepEqual(toRoleArray('{"weird role",anon}'), ['weird role', 'anon'])
  assert.deepEqual(toRoleArray(['authenticated']), ['authenticated']) // post-cast shape
  assert.deepEqual(toRoleArray(null), [])
})

test('policies value survives the raw string roles that killed the tool', () => {
  // Verbatim driver output, confirmed against the live prod DB on 17 Jul 2026:
  // roles arrives as the string "{anon}" with dataTypeID 1003.
  const v = QUERIES.policies.value({
    table_name: 'site_settings',
    policy_name: 'Anon can read settings',
    permissive: 'PERMISSIVE',
    roles: '{anon}',
    cmd: 'SELECT',
    qual: 'true',
    with_check: null,
  })
  assert.match(v, /roles=\{anon\}/)
})

test('policies value formatting sorts roles and normalises quals', () => {
  const v = QUERIES.policies.value({
    table_name: 'members',
    policy_name: 'Members can access own data',
    permissive: 'PERMISSIVE',
    roles: ['authenticated', 'anon'],
    cmd: 'ALL',
    qual: '(( SELECT auth.email() AS email) = email)',
    with_check: null,
  })
  assert.match(v, /roles=\{anon,authenticated\}/)
  assert.match(v, /qual=\(\( SELECT auth\.email\(\) AS email\) = email\)/)
  assert.match(v, /with_check=\(none\)/)
})

// ── grants ──────────────────────────────────────────────────────────────────

test('foldGrants collapses a table-wide grant to ALL, not one entry per column', () => {
  // The whole reason this reads pg_catalog rather than
  // information_schema.column_privileges: there a table-wide grant expands into
  // one row per column and is indistinguishable from a column-scoped grant.
  const m = foldGrants([acl('members', 'anon', 'SELECT')])
  assert.deepEqual([...m], [['members [anon]', 'SELECT=ALL']])
})

test('foldGrants lists the columns of a column-scoped grant, sorted', () => {
  const m = foldGrants([
    acl('members', 'authenticated', 'UPDATE', 'is_run_leader'),
    acl('members', 'authenticated', 'UPDATE', 'first_name'),
  ])
  assert.deepEqual([...m], [['members [authenticated]', 'UPDATE=(first_name,is_run_leader)']])
})

test('foldGrants: a table-wide grant subsumes a column-scoped one of the same privilege', () => {
  // Effective privilege is what matters - a table-wide UPDATE already permits
  // every column, so listing the redundant column grant would be misleading.
  const m = foldGrants([
    acl('members', 'authenticated', 'UPDATE'),
    acl('members', 'authenticated', 'UPDATE', 'is_run_leader'),
  ])
  assert.deepEqual([...m], [['members [authenticated]', 'UPDATE=ALL']])
})

test('foldGrants groups per table+grantee and sorts privileges', () => {
  const m = foldGrants([
    acl('members', 'authenticated', 'SELECT'),
    acl('members', 'authenticated', 'DELETE'),
    acl('members', 'anon', 'SELECT'),
    acl('runs', 'anon', 'SELECT'),
  ])
  assert.deepEqual(
    [...m],
    [
      ['members [anon]', 'SELECT=ALL'],
      ['members [authenticated]', 'DELETE=ALL | SELECT=ALL'],
      ['runs [anon]', 'SELECT=ALL'],
    ],
  )
})

test('grants diff catches a re-granted write verb on members', () => {
  // The regression this category exists to catch: someone re-grants UPDATE on
  // one project. Before this, db-diff reported "no drift" for exactly this.
  const dev = foldGrants([acl('members', 'authenticated', 'SELECT')])
  const prod = foldGrants([
    acl('members', 'authenticated', 'SELECT'),
    acl('members', 'authenticated', 'UPDATE', 'is_run_leader'),
  ])
  const d = diffMaps(dev, prod)
  assert.equal(d.count, 1)
  assert.deepEqual(d.differing, [
    {
      key: 'members [authenticated]',
      dev: 'SELECT=ALL',
      prod: 'SELECT=ALL | UPDATE=(is_run_leader)',
    },
  ])
})

test('grantAlarms fires on a write grant to authenticated on members', () => {
  const a = grantAlarms([acl('members', 'authenticated', 'UPDATE', 'is_run_leader')])
  assert.equal(a.length, 1)
  assert.equal(a[0].privilege, 'UPDATE')
  assert.equal(a[0].grantee, 'authenticated')
  assert.equal(a[0].scope, 'columns (is_run_leader)')
})

test('grantAlarms fires when BOTH projects are identically wrong (the pre-16-Jul state)', () => {
  // The point of an intent check rather than only a diff: on 15 Jul dev and prod
  // both granted table-wide UPDATE, so a pure diff said "no drift" while the
  // escalation hole was open on both.
  const rows = [acl('members', 'authenticated', 'UPDATE'), acl('members', 'anon', 'INSERT')]
  assert.equal(diffMaps(foldGrants(rows), foldGrants(rows)).count, 0) // diff is blind
  assert.equal(grantAlarms(rows).length, 2) // the alarm is not
})

test('grantAlarms reports a table-wide write as all columns', () => {
  const a = grantAlarms([acl('members', 'anon', 'INSERT')])
  assert.deepEqual(a.map((x) => x.scope), ['all columns'])
})

test('grantAlarms catches a grant to PUBLIC, which reaches anon implicitly', () => {
  // A GRANT ... TO PUBLIC is not visible if you only filter for the two named
  // roles, but anon and authenticated both inherit it.
  assert.equal(grantAlarms([acl('members', 'PUBLIC', 'UPDATE')]).length, 1)
})

// The REAL grants on members, read from BOTH live projects on 17 Jul 2026 (they
// are identical). Not an invented "correct-looking" fixture: an earlier draft of
// this file guessed SELECT + REFERENCES + TRIGGER, passed, and hid the fact that
// TRUNCATE is granted to both roles - which would have made the alarm fire four
// times against a correct database on its first real run.
const LIVE_MEMBERS_GRANTS = [
  acl('members', 'anon', 'MAINTAIN'),
  acl('members', 'anon', 'REFERENCES'),
  acl('members', 'anon', 'SELECT'),
  acl('members', 'anon', 'TRIGGER'),
  acl('members', 'anon', 'TRUNCATE'),
  acl('members', 'authenticated', 'MAINTAIN'),
  acl('members', 'authenticated', 'REFERENCES'),
  acl('members', 'authenticated', 'SELECT'),
  acl('members', 'authenticated', 'TRIGGER'),
  acl('members', 'authenticated', 'TRUNCATE'),
]

test('grantAlarms stays quiet on the real, correct live state', () => {
  // SELECT is expected (own-row read via the policy). TRUNCATE/MAINTAIN/
  // REFERENCES/TRIGGER are Supabase defaults on 16 of 16 public tables and are
  // not data writes reachable through PostgREST. If any of them fired, the alarm
  // would cry wolf on a correct database and bury a real regression.
  assert.deepEqual(grantAlarms(LIVE_MEMBERS_GRANTS), [])
})

test('the live state renders SELECT=ALL alongside the inert default grants', () => {
  // The watched line is printed even when clean, so the breadth stays visible:
  // anon holds SELECT on every column, inert only while no anon SELECT policy
  // exists. Add one for a public page and emergency_phone goes with it.
  const lines = watchedGrantLines(foldGrants(LIVE_MEMBERS_GRANTS))
  assert.deepEqual(lines, [
    ['members [anon]', 'MAINTAIN=ALL | REFERENCES=ALL | SELECT=ALL | TRIGGER=ALL | TRUNCATE=ALL'],
    ['members [authenticated]', 'MAINTAIN=ALL | REFERENCES=ALL | SELECT=ALL | TRIGGER=ALL | TRUNCATE=ALL'],
  ])
})

test('the escalation that was closed on 16 Jul would alarm today', () => {
  // The exact pre-fix shape: authenticated could PATCH its own row to PostgREST
  // with { is_run_leader: true } and then read the club's medical PII.
  const a = grantAlarms([...LIVE_MEMBERS_GRANTS, acl('members', 'authenticated', 'UPDATE')])
  assert.equal(a.length, 1)
  assert.equal(a[0].privilege, 'UPDATE')
})

test('grantAlarms ignores write grants on tables that are not write-locked', () => {
  // Narrow by design: every public table carries broad Supabase default grants,
  // and alarming on all of them would bury a real members regression.
  assert.deepEqual(grantAlarms([acl('runs', 'authenticated', 'UPDATE')]), [])
})

test('watchedGrantLines surfaces the inert-but-broad anon SELECT on members', () => {
  const m = foldGrants([
    acl('members', 'anon', 'SELECT'),
    acl('runs', 'anon', 'SELECT'),
  ])
  assert.deepEqual(watchedGrantLines(m), [['members [anon]', 'SELECT=ALL']])
})

test('watchedGrantLines does not match a table that merely shares a prefix', () => {
  const m = foldGrants([acl('members_archive', 'anon', 'SELECT')])
  assert.deepEqual(watchedGrantLines(m), [])
})

test('columns key and value are stable and readable', () => {
  const row = {
    table_name: 'members',
    column_name: 'email',
    data_type: 'text',
    not_null: true,
    column_default: null,
  }
  assert.equal(QUERIES.columns.key(row), 'members.email')
  assert.equal(QUERIES.columns.value(row), 'text | nullable=false | default=(none)')
})
