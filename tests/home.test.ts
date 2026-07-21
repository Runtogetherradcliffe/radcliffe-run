import { describe, it, expect } from 'vitest'
import { usualGroupFromCounts, freshWeeklyNote, type GroupCounts } from '@/lib/home'

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

describe('freshWeeklyNote (schedule-anchored)', () => {
  // Tuesday 21 Jul 2026, 10:00 UTC - a real club week: Thursday 23rd,
  // and (on social weekends) Sunday 26th.
  const EDIT = '2026-07-21T10:00:00.000Z'
  const at = (iso: string) => new Date(iso).getTime()
  const note = { weekly_note: 'Banana Path this week', weekly_note_updated_at: EDIT }

  it('an ordinary Thursday week dies Friday morning, not seven days on', () => {
    const runs = ['2026-07-23']
    expect(freshWeeklyNote(note, runs, at('2026-07-23T22:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, runs, at('2026-07-24T03:59:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, runs, at('2026-07-24T05:00:00Z'))).toBeNull()
  })

  it('a Sunday social keeps the note alive through the weekend', () => {
    const runs = ['2026-07-23', '2026-07-26']
    expect(freshWeeklyNote(note, runs, at('2026-07-24T09:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, runs, at('2026-07-26T23:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, runs, at('2026-07-27T05:00:00Z'))).toBeNull()
  })

  it('a run on the edit day itself anchors (Thursday-afternoon note)', () => {
    const thuNote = { ...note, weekly_note_updated_at: '2026-07-23T15:00:00.000Z' }
    const runs = ['2026-07-23']
    expect(freshWeeklyNote(thuNote, runs, at('2026-07-23T22:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(thuNote, runs, at('2026-07-24T05:00:00Z'))).toBeNull()
  })

  it('runs before the note was written never anchor it', () => {
    // Only run in sight is the PREVIOUS Thursday: falls back to the 7-day
    // cap instead of dying instantly on a stale anchor.
    const runs = ['2026-07-16']
    expect(freshWeeklyNote(note, runs, at('2026-07-25T10:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, runs, at('2026-07-28T11:00:00Z'))).toBeNull()
  })

  it('runs beyond the 7-day window are ignored', () => {
    const runs = ['2026-08-06']
    expect(freshWeeklyNote(note, runs, at('2026-07-27T10:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, runs, at('2026-07-28T11:00:00Z'))).toBeNull()
  })

  it('an empty schedule window falls back to the plain 7-day cap', () => {
    expect(freshWeeklyNote(note, [], at('2026-07-27T10:00:00Z'))).toBe('Banana Path this week')
    expect(freshWeeklyNote(note, [], at('2026-07-28T11:00:00Z'))).toBeNull()
  })

  it('treats cleared, blank and unset notes as absent', () => {
    expect(freshWeeklyNote({ weekly_note: null, weekly_note_updated_at: EDIT }, ['2026-07-23'])).toBeNull()
    expect(freshWeeklyNote({ weekly_note: '   ', weekly_note_updated_at: EDIT }, ['2026-07-23'])).toBeNull()
    expect(freshWeeklyNote(null, ['2026-07-23'])).toBeNull()
  })

  it('never serves a note with no timestamp to judge it by', () => {
    expect(freshWeeklyNote({ weekly_note: 'text', weekly_note_updated_at: null }, ['2026-07-23'])).toBeNull()
  })

  it('trims the served text', () => {
    const padded = { weekly_note: '  note  ', weekly_note_updated_at: EDIT }
    expect(freshWeeklyNote(padded, ['2026-07-23'], at('2026-07-22T10:00:00Z'))).toBe('note')
  })
})
