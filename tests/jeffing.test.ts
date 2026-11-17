import { describe, expect, it } from 'vitest'
import { defaultHasJeffing } from '@/lib/jeffing'

describe('defaultHasJeffing', () => {
  it('is on for the 5k group', () => {
    expect(defaultHasJeffing(5, false)).toBe(true)
    expect(defaultHasJeffing(5.2, false)).toBe(true)
  })
  it('is off for the 8k group, unknown distances and "No run" weeks', () => {
    expect(defaultHasJeffing(8, false)).toBe(false)
    expect(defaultHasJeffing(null, false)).toBe(false)
    expect(defaultHasJeffing(5, true)).toBe(false)
  })
})
