/**
 * The Thursday announcement copy - the automated push members actually see.
 * Pure logic in lib/pushAnnouncement.ts; the send route only adds I/O.
 */
import { describe, it, expect } from 'vitest'
import { composeAnnouncement, type AnnouncementRun } from '@/lib/pushAnnouncement'

function run(partial: Partial<AnnouncementRun>): AnnouncementRun {
  return {
    title: 'Banana Path One Loop',
    distance_km: null,
    meeting_point: 'Radcliffe Market',
    on_tour: false,
    cancelled: false,
    has_jeffing: false,
    ...partial,
  }
}

describe('composeAnnouncement', () => {
  it('merges the two Thursday group rows: shortest first, jeffing appended', () => {
    const msg = composeAnnouncement([
      run({ distance_km: 5.0, has_jeffing: true }),
      run({ distance_km: 8.0 }),
    ])
    expect(msg).toEqual({
      title: 'Tonight: Banana Path One Loop',
      body: '5k & 8k & Jeffing · 7pm · Radcliffe Market',
    })
  })

  it('dedupes equal distances and keeps one-decimal labels', () => {
    const msg = composeAnnouncement([
      run({ distance_km: 5.4 }),
      run({ distance_km: 5.4 }),
    ])
    expect(msg?.body).toBe('5.4k · 7pm · Radcliffe Market')
  })

  it('handles PostgREST numeric-as-string distances', () => {
    const msg = composeAnnouncement([run({ distance_km: '8.0' })])
    expect(msg?.body).toBe('8k · 7pm · Radcliffe Market')
  })

  it('on-tour variant names the destination and the real meeting point', () => {
    const msg = composeAnnouncement([
      run({ title: 'Ainsworth Reservoirs', on_tour: true, meeting_point: 'Church Inn, Ainsworth', distance_km: 5.4 }),
    ])
    expect(msg).toEqual({
      title: "Tonight we're On Tour: Ainsworth Reservoirs",
      body: '5.4k · 7pm · Church Inn, Ainsworth',
    })
  })

  it('cancelled runs are excluded; all-cancelled sends nothing', () => {
    expect(composeAnnouncement([run({ cancelled: true })])).toBeNull()
    const msg = composeAnnouncement([
      run({ cancelled: true, distance_km: 8 }),
      run({ distance_km: 5 }),
    ])
    expect(msg?.body).toBe('5k · 7pm · Radcliffe Market')
  })

  it('empty input sends nothing', () => {
    expect(composeAnnouncement([])).toBeNull()
  })

  it('falls back when fields are missing (no distances, no meeting point, no title)', () => {
    const msg = composeAnnouncement([run({ title: null, meeting_point: null })])
    expect(msg).toEqual({ title: 'Tonight: club run', body: '7pm · Radcliffe Market' })
  })
})
