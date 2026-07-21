import { describe, it, expect } from 'vitest'
import { usualGroupFromCounts, freshWeeklyNote, WEEKLY_NOTE_FRESH_MS, type GroupCounts } from '@/lib/home'

// Runner-home usual-group tile: null until 3+ live-era check-ins AND a
// strict majority. Decision record: docs/RUNNER_HOME_BRIEF.md.
describe('usualGroupFromCounts', () => {
  const counts = (over: Partial<GroupCounts>): GroupCounts => ({
    '8k': 0,
    '5k': 0,
    jeff: 0,
    ...over,
  })

  it('null below the 3-check-in threshold, even with a clean sweep', () => {
    expect(usualGroupFromCounts(counts({ '5k': 2 }))).toBeNull()
  })

  it('a strict majority at exactly 3', () => {
    expect(usualGroupFromCounts(counts({ '8k': 2, '5k': 1 }))).toBe('8k')
  })

  it('no majority - split evenly - renders null (equal tiles)', () => {
    expect(usualGroupFromCounts(counts({ '8k': 2, '5k': 2 }))).toBeNull()
  })

  it('exactly half is not a strict majority', () => {
    expect(usualGroupFromCounts(counts({ '8k': 3, '5k': 3 }))).toBeNull()
  })

  it('jeff can be the usual group', () => {
    expect(usualGroupFromCounts(counts({ jeff: 4, '5k': 1 }))).toBe('jeff')
  })
})

describe('freshWeeklyNote', () => {
  const NOW = 1_763_000_000_000
  const at = (ageMs: number) => new Date(NOW - ageMs).toISOString()
  const DAY = 24 * 60 * 60 * 1000

  it('serves a fresh note', () => {
    expect(freshWeeklyNote({ weekly_note: 'Banana Path this week', weekly_note_updated_at: at(2 * DAY) }, NOW))
      .toBe('Banana Path this week')
  })

  it('falls silent once the note is older than the window', () => {
    expect(freshWeeklyNote({ weekly_note: 'Banana Path this week', weekly_note_updated_at: at(WEEKLY_NOTE_FRESH_MS + 1) }, NOW))
      .toBeNull()
  })

  it('treats cleared, blank and unset notes as absent', () => {
    expect(freshWeeklyNote({ weekly_note: null, weekly_note_updated_at: at(DAY) }, NOW)).toBeNull()
    expect(freshWeeklyNote({ weekly_note: '   ', weekly_note_updated_at: at(DAY) }, NOW)).toBeNull()
    expect(freshWeeklyNote(null, NOW)).toBeNull()
  })

  it('never serves a note with no timestamp to judge it by', () => {
    expect(freshWeeklyNote({ weekly_note: 'text', weekly_note_updated_at: null }, NOW)).toBeNull()
  })

  it('trims the served text', () => {
    expect(freshWeeklyNote({ weekly_note: '  note  ', weekly_note_updated_at: at(DAY) }, NOW)).toBe('note')
  })
})
