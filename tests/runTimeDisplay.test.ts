import { describe, it, expect } from 'vitest'
import { formatClock, formatRunTimeLine } from '@/lib/runTimes'

// The site renders runs.start_time/end_time in the same words as the native
// app. NULL start_time is the club convention (7pm), not missing data, so the
// helpers must return null and let the caller keep its own default.
describe('formatClock', () => {
  it('renders the shapes Postgres and the sheet produce', () => {
    expect(formatClock('09:00:00')).toBe('9:00am')
    expect(formatClock('9:00')).toBe('9:00am')
    expect(formatClock('10:30:00')).toBe('10:30am')
    expect(formatClock('13:30:00')).toBe('1:30pm')
    expect(formatClock('19:00:00')).toBe('7:00pm')
  })

  it('handles noon and midnight without a 0 o\'clock', () => {
    expect(formatClock('12:00:00')).toBe('12:00pm')
    expect(formatClock('00:30:00')).toBe('12:30am')
  })

  it('returns null for anything that is not a time', () => {
    expect(formatClock(null)).toBeNull()
    expect(formatClock(undefined)).toBeNull()
    expect(formatClock('')).toBeNull()
    expect(formatClock('TBC')).toBeNull()
    expect(formatClock('10.30')).toBeNull()
    expect(formatClock('24:00')).toBeNull()
    expect(formatClock('10:60')).toBeNull()
  })
})

describe('formatRunTimeLine', () => {
  it('gives the app\'s wording when the sheet has both times', () => {
    expect(formatRunTimeLine('09:00:00', '09:30:00')).toBe('Sets off 9:00am - back about 9:30am')
    expect(formatRunTimeLine('10:30:00', '13:30:00')).toBe('Sets off 10:30am - back about 1:30pm')
  })

  it('drops the return half when there is no end time', () => {
    expect(formatRunTimeLine('09:00:00', null)).toBe('Sets off 9:00am')
    expect(formatRunTimeLine('09:00:00', 'TBC')).toBe('Sets off 9:00am')
  })

  it('is null without a start time, so the club convention still shows', () => {
    expect(formatRunTimeLine(null, null)).toBeNull()
    expect(formatRunTimeLine(null, '20:00:00')).toBeNull()
  })
})
