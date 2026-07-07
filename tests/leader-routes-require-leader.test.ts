/**
 * Companion to admin-routes-require-admin.test.ts, for the leader surface:
 * every /api/leader/* route must gate on run-leader identity - either the
 * shared requireLeader() (lib/apiAuth.ts, cookie or Bearer) or the original
 * inline pattern (session + is_run_leader lookup on the service role, as in
 * app/api/leader/member/[id]/route.ts). These routes serve emergency
 * contacts and medical notes - the most sensitive data in the system.
 *
 * Static check (part of `npm test`, no server); the tests/access harness
 * verifies actual behaviour against a running server.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const REPO_ROOT = path.resolve(__dirname, '..')
const LEADER_API_DIR = path.join(REPO_ROOT, 'app/api/leader')

function leaderRouteFiles(): string[] {
  return readdirSync(LEADER_API_DIR, { recursive: true, encoding: 'utf8' })
    .filter((f) => typeof f === 'string' && f.endsWith('route.ts'))
    .map((f) => path.join(LEADER_API_DIR, f))
    .sort()
}

describe('every /api/leader route gates on run-leader identity', () => {
  const files = leaderRouteFiles()

  it('there are leader route files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file)
    it(`${rel} calls requireLeader() or checks is_run_leader`, () => {
      const src = readFileSync(file, 'utf8')
      const usesShared = /from\s+['"]@\/lib\/apiAuth['"]/.test(src) && /requireLeader\s*\(/.test(src)
      const usesInline = /is_run_leader/.test(src)
      expect(
        usesShared || usesInline,
        `${rel} must gate on run-leader identity (requireLeader() from @/lib/apiAuth, or the inline is_run_leader check)`
      ).toBe(true)
    })
  }
})
