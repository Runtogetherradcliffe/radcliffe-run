/**
 * The optional device-description fields on POST /api/push/register
 * (Sept 2026): runtime, update_id, app_build. The native app sends all three
 * on every registration (rtr-app src/lib/pushDeviceInfo.ts), null when a
 * value is not available; older app versions send none.
 *
 * Pure validation, kept out of the route so it is unit-testable: each field
 * is either a short trimmed string or null. Anything else (a number, an
 * object, an empty string, an over-long string) becomes null rather than a
 * 400, because these fields are diagnostic - a device must never be refused
 * push registration over them.
 */
export const PUSH_DEVICE_FIELD_MAX = 128

export type PushDeviceFields = {
  runtime: string | null
  update_id: string | null
  app_build: string | null
}

function asShortString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (s.length === 0 || s.length > PUSH_DEVICE_FIELD_MAX) return null
  return s
}

export function pushDeviceFields(body: unknown): PushDeviceFields {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  return {
    runtime: asShortString(b.runtime),
    update_id: asShortString(b.update_id),
    app_build: asShortString(b.app_build),
  }
}
