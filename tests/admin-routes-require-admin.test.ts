/**
 * Enforces the AGENTS.md invariant: every /api/admin/* route must gate on
 * requireAdmin() (lib/admin.ts). middleware.ts protects /admin/* PAGES but NOT
 * /api/admin/* API paths, so a route that only checks "is there a session" is
 * callable by any signed-in member. Eight routes shipped that way once and were
 * fixed (Jul 2026); this test breaks CI if a new admin route reintroduces it.
 *
 * Static check (part of `npm test`, no server): asserts each route file imports
 * the admin helper module and invokes requireAdmin. It is file-level - it does
 * not prove every individual HTTP handler in a file is guarded; the tests/access
 * harness verifies actual per-route access behaviour against a running server.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const REPO_ROOT = path.resolve(__dirname, '..')
const ADMIN_API_DIR = path.join(REPO_ROOT, 'app/api/admin')

function adminRouteFiles(): string[] {
  return readdirSync(ADMIN_API_DIR, { recursive: true, encoding: 'utf8' })
    .filter((f) => typeof f === 'string' && f.endsWith('route.ts'))
    .map((f) => path.join(ADMIN_API_DIR, f))
    .sort()
}

describe('every /api/admin route calls requireAdmin (AGENTS.md invariant)', () => {
  const files = adminRouteFiles()

  it('there are admin route files to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file)
    it(`${rel} imports and calls requireAdmin()`, () => {
      const src = readFileSync(file, 'utf8')
      expect(src, `${rel} must import from '@/lib/admin'`).toMatch(/from\s+['"]@\/lib\/admin['"]/)
      expect(src, `${rel} must call requireAdmin()`).toMatch(/requireAdmin\s*\(/)
    })
  }
})
