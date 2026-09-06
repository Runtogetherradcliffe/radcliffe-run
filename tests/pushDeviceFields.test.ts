/**
 * lib/pushDeviceFields.ts - the three optional device fields on
 * POST /api/push/register. The contract with the app (rtr-app
 * src/lib/pushDeviceInfo.ts): strings or null, never undefined; the site must
 * accept older payloads that omit them entirely and must never refuse a
 * registration because of them.
 */
import { describe, it, expect } from 'vitest'
import { pushDeviceFields, PUSH_DEVICE_FIELD_MAX } from '@/lib/pushDeviceFields'

describe('pushDeviceFields', () => {
  it('passes the three fields through as trimmed strings', () => {
    expect(
      pushDeviceFields({
        runtime: ' ca9337fb1241b1d273e0046412a0caa1c9f95b03 ',
        update_id: '01a06b82-45fc-789f-a135-38180ceecf47',
        app_build: '10',
      })
    ).toEqual({
      runtime: 'ca9337fb1241b1d273e0046412a0caa1c9f95b03',
      update_id: '01a06b82-45fc-789f-a135-38180ceecf47',
      app_build: '10',
    })
  })

  it('is all-null for an older payload that omits the fields', () => {
    expect(pushDeviceFields({ token: 'ExponentPushToken[x]', platform: 'ios' })).toEqual({
      runtime: null,
      update_id: null,
      app_build: null,
    })
  })

  it('keeps explicit nulls as null (embedded bundle sends update_id: null)', () => {
    expect(pushDeviceFields({ runtime: 'abc', update_id: null, app_build: null })).toEqual({
      runtime: 'abc',
      update_id: null,
      app_build: null,
    })
  })

  it('turns anything that is not a usable string into null instead of failing', () => {
    expect(
      pushDeviceFields({
        runtime: 42,
        update_id: { nested: true },
        app_build: '',
      })
    ).toEqual({ runtime: null, update_id: null, app_build: null })
    expect(pushDeviceFields({ runtime: 'x'.repeat(PUSH_DEVICE_FIELD_MAX + 1) }).runtime).toBeNull()
    expect(pushDeviceFields({ runtime: 'x'.repeat(PUSH_DEVICE_FIELD_MAX) }).runtime).toHaveLength(
      PUSH_DEVICE_FIELD_MAX
    )
  })

  it('tolerates a non-object body', () => {
    expect(pushDeviceFields(null)).toEqual({ runtime: null, update_id: null, app_build: null })
    expect(pushDeviceFields('nope')).toEqual({ runtime: null, update_id: null, app_build: null })
  })
})
