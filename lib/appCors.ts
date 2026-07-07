/**
 * CORS policy for the app-facing API paths (native app / browser-preview
 * callers) - consumed by middleware.ts, unit-tested in tests/appCors.test.ts.
 * Native fetch ignores CORS; this exists so the app's browser-based
 * verification loop can call the same endpoints. Auth is still enforced by
 * each route (Bearer/cookie) - CORS is not a security layer. Note that
 * Allow-Origin "*" cannot be combined with credentials by browsers, so
 * cookie-session exposure is unchanged.
 */

export const APP_API_PATHS = [
  '/api/routes',
  '/api/leader',
  '/api/push/register',
  '/api/join',
  '/api/check-member',
  '/api/profile',
] as const

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

/** Exact path or a sub-path (segment boundary - "/api/joinery" must NOT match). */
export function isAppApi(pathname: string): boolean {
  return APP_API_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}
