/**
 * CORS policy for app-facing API paths (lib/appCors.ts, consumed by
 * middleware.ts). The matcher must hit exactly the app surface - nothing
 * else gains CORS headers or skips the middleware's page logic.
 */
import { describe, it, expect } from 'vitest'
import { APP_API_PATHS, CORS_HEADERS, isAppApi } from '@/lib/appCors'

describe('isAppApi', () => {
  it('matches the app-facing endpoints exactly', () => {
    for (const p of [
      '/api/routes',
      '/api/join',
      '/api/check-member',
      '/api/profile',
      '/api/push/register',
      '/api/leader/contacts',
      '/api/leader/register',
      '/api/leader/checkin',
      '/api/leader/member/some-uuid',
      '/api/attendance/summary',
      '/api/home',
      '/api/walks',
    ]) {
      expect(isAppApi(p), p).toBe(true)
    }
  })

  it('does NOT match prefixes without a segment boundary', () => {
    expect(isAppApi('/api/joinery')).toBe(false)
    expect(isAppApi('/api/routesx')).toBe(false)
    expect(isAppApi('/api/profiles')).toBe(false)
  })

  it('does NOT match admin, cron, or page paths', () => {
    for (const p of [
      '/api/admin/members/1',
      '/api/admin/notify',
      '/api/cron/send-push',
      '/api/cron/send-emails',
      '/api/unsubscribe',
      '/admin',
      '/leader',
      '/',
    ]) {
      expect(isAppApi(p), p).toBe(false)
    }
  })

  it('cron routes are deliberately outside the CORS surface', () => {
    // CRON_SECRET-authed endpoints are server-to-server only.
    expect(APP_API_PATHS.some(p => p.startsWith('/api/cron'))).toBe(false)
  })
})

describe('CORS_HEADERS', () => {
  it('allows the Bearer transport the app uses', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Headers']).toContain('Authorization')
  })

  it('wildcard origin (credential-less by browser rule - cookie CSRF surface unchanged)', () => {
    expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*')
  })
})
