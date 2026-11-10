import { describe, expect, it } from 'vitest'
import { isNoRunNight, isNoRunTitle, syncCancelledUpdate } from '@/lib/noRun'

describe('isNoRunTitle', () => {
  it('matches the sheet wording, any case, with trailing words', () => {
    expect(isNoRunTitle('No run')).toBe(true)
    expect(isNoRunTitle('no run')).toBe(true)
    expect(isNoRunTitle('  NO RUN ')).toBe(true)
    expect(isNoRunTitle('No run - Merry Christmas')).toBe(true)
  })

  it('does not match real route names or empty values', () => {
    expect(isNoRunTitle('Outwood OAB')).toBe(false)
    expect(isNoRunTitle('Nobody runs alone')).toBe(false)
    expect(isNoRunTitle('No running club social')).toBe(false)
    expect(isNoRunTitle('')).toBe(false)
    expect(isNoRunTitle(null)).toBe(false)
    expect(isNoRunTitle(undefined)).toBe(false)
  })
})

describe('isNoRunNight', () => {
  it('needs both the "No run" name and the cancelled flag', () => {
    expect(isNoRunNight({ title: 'No run', cancelled: true })).toBe(true)
    // Not yet synced with the flag: still shown as an ordinary row elsewhere
    expect(isNoRunNight({ title: 'No run', cancelled: false })).toBe(false)
    // Cancelled by hand (weather): a different thing, stays hidden on the site
    expect(isNoRunNight({ title: 'Outwood OAB', cancelled: true })).toBe(false)
  })
})

describe('syncCancelledUpdate', () => {
  it('always cancels a "No run" row', () => {
    expect(syncCancelledUpdate('No run', 'Outwood OAB')).toEqual({ cancelled: true })
    expect(syncCancelledUpdate('No run', 'No run')).toEqual({ cancelled: true })
  })

  it('un-cancels a week that used to be "No run" and now has a route', () => {
    expect(syncCancelledUpdate('Outwood OAB', 'No run')).toEqual({ cancelled: false })
  })

  it('leaves a hand-cancelled run alone', () => {
    expect(syncCancelledUpdate('Outwood OAB', 'Outwood OAB')).toEqual({})
    expect(syncCancelledUpdate('Outwood OAB', null)).toEqual({})
  })
})
