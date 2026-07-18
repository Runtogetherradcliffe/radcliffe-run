import { describe, it, expect } from 'vitest'
import { parseTime, parseSocialRows } from '@/app/api/admin/runs/sync/route'

// The social sheet's Start/End Time columns feed runs.start_time/end_time.
// NULL is meaningful: it means the club convention (7pm) applies, so anything
// that is not a real time must come back null rather than a guess.
describe('parseTime', () => {
  it('normalises the shapes Google Sheets exports', () => {
    expect(parseTime('10:30')).toBe('10:30:00')    // the 19 Jul 2026 social
    expect(parseTime('9:00')).toBe('09:00:00')     // unpadded hour
    expect(parseTime('09:00:00')).toBe('09:00:00') // already full
    expect(parseTime(' 13:30 ')).toBe('13:30:00')  // stray whitespace
  })

  it('returns null for anything that is not a time', () => {
    expect(parseTime('')).toBeNull()
    expect(parseTime('TBC')).toBeNull()
    expect(parseTime('10.30')).toBeNull()
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('10:60')).toBeNull()
  })
})

// Guards the column map against a sheet reshuffle: these are the real header and
// row from the social sheet, the run that started this (it sets off at 10:30,
// not the 7pm the app used to imply).
describe('parseSocialRows', () => {
  const header = ['Date', 'Title', 'Start Time', 'End Time', 'Location', 'Route URL', 'Distance', 'Notes', 'Cancel?', 'Event ID']
  const row = [
    'Sunday 19 July 26',
    'Steel Cotton Rail trail - Stage 5 - Hathersage to Sheffield',
    '10:30', '13:30',
    'Hathersage Train Station ',
    'https://runtogetherradcliffe.github.io/RTRinfo/routes.html#social-long-run--steel-cotton-rail-trail-stage-5-hathersage-to-sheffield',
    '22.1', '1 steep uphill and 1 steep downhill', '', 'ien52d4o8g9oikrc5rkh5c3oc8@google.com',
  ]

  it('reads the times from columns 2 and 3', () => {
    const [run] = parseSocialRows([header, row])
    expect(run.start_time).toBe('10:30:00')
    expect(run.end_time).toBe('13:30:00')
    expect(run.meeting_point).toBe('Hathersage Train Station')
    expect(run.distance_km).toBe(22.1)
  })

  it('leaves the times null when the sheet has none', () => {
    const [run] = parseSocialRows([header, [...row.slice(0, 2), '', '', ...row.slice(4)]])
    expect(run.start_time).toBeNull()
    expect(run.end_time).toBeNull()
  })
})
