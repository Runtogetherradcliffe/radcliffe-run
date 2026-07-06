// Unit tests for the pure diff/introspection helpers in db-diff.mjs.
// These do NOT touch a database - they verify the categorisation, normalisation
// and value-formatting logic that turns two catalog snapshots into a drift
// report. Run: npm run db-diff:test   (node's test runner, no DB, no creds).
// Deliberately NOT under tests/ so it stays out of the default `npm test` / CI
// glob - db-diff is opt-in tooling that needs live credentials to run for real.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QUERIES, contype, normalizeSql, diffMaps } from './db-diff.mjs'

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
