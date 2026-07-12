import { describe, it, expect } from 'vitest'
import { rungsAchieved, nextRung, isCentury, COUNTED_RUN_TYPES, computeAwardRows } from '@/lib/recognition'

// Ladder (Paul, 12 Jul 2026): approach rungs 10 / 25 / 50 / 75 / 100, then
// every 25 forever; centuries (every 100th) stay the celebrated tier. Both
// ladders share this list. Decision record: docs/ATTENDANCE_RECOGNITION_BRIEF.md.
describe('rungsAchieved', () => {
  it('nothing below 10', () => {
    expect(rungsAchieved(0)).toEqual([])
    expect(rungsAchieved(9)).toEqual([])
  })

  it('early rungs at 10/25/50/75', () => {
    expect(rungsAchieved(10)).toEqual([10])
    expect(rungsAchieved(24)).toEqual([10])
    expect(rungsAchieved(25)).toEqual([10, 25])
    expect(rungsAchieved(50)).toEqual([10, 25, 50])
    expect(rungsAchieved(74)).toEqual([10, 25, 50])
    expect(rungsAchieved(75)).toEqual([10, 25, 50, 75])
    expect(rungsAchieved(99)).toEqual([10, 25, 50, 75])
  })

  it('every 25 from 100 (the chain continues)', () => {
    expect(rungsAchieved(100)).toEqual([10, 25, 50, 75, 100])
    expect(rungsAchieved(124)).toEqual([10, 25, 50, 75, 100])
    expect(rungsAchieved(125)).toEqual([10, 25, 50, 75, 100, 125])
    expect(rungsAchieved(200)).toEqual([10, 25, 50, 75, 100, 125, 150, 175, 200])
  })

  it('launch-day leader seeds land on real rungs (Ken 131, Paul 160)', () => {
    expect(rungsAchieved(131)).toEqual([10, 25, 50, 75, 100, 125])
    expect(rungsAchieved(160)).toEqual([10, 25, 50, 75, 100, 125, 150])
  })
})

describe('nextRung', () => {
  it('walks the early ladder', () => {
    expect(nextRung(0)).toBe(10)
    expect(nextRung(10)).toBe(25)
    expect(nextRung(25)).toBe(50)
    expect(nextRung(50)).toBe(75)
    expect(nextRung(74)).toBe(75)
    expect(nextRung(75)).toBe(100)
    expect(nextRung(99)).toBe(100)
  })

  it('then every 25', () => {
    expect(nextRung(100)).toBe(125)
    expect(nextRung(124)).toBe(125)
    expect(nextRung(125)).toBe(150)
    expect(nextRung(160)).toBe(175)
    expect(nextRung(200)).toBe(225)
    expect(nextRung(999)).toBe(1000)
  })

  it('toNext at the boundaries', () => {
    expect(nextRung(160) - 160).toBe(15)
    expect(nextRung(200) - 200).toBe(25)
    expect(nextRung(74) - 74).toBe(1)
    expect(nextRung(100) - 100).toBe(25)
  })
})

describe('isCentury (the celebrated tier)', () => {
  it('every 100th rung is a century, the rest are quiet', () => {
    expect(isCentury(100)).toBe(true)
    expect(isCentury(200)).toBe(true)
    expect(isCentury(1000)).toBe(true)
    expect(isCentury(10)).toBe(false)
    expect(isCentury(75)).toBe(false)
    expect(isCentury(125)).toBe(false)
    expect(isCentury(150)).toBe(false)
    expect(isCentury(175)).toBe(false)
  })

  it('rung % 100 === 0 holds across a generated ladder', () => {
    for (const rung of rungsAchieved(300)) {
      expect(isCentury(rung)).toBe(rung % 100 === 0)
    }
  })
})

describe('counting scope', () => {
  it('counts regular + c25k only (socials/walks never count)', () => {
    expect(COUNTED_RUN_TYPES).toEqual(['regular', 'c25k'])
  })
})

// computeAwardRows is the pure core of the awards job (lib/awardsJob.ts):
// dating and the first-run backfill notified_at rule. Decision record:
// docs/ATTENDANCE_RECOGNITION_BRIEF.md (12 Jul 2026 build).
describe('computeAwardRows', () => {
  const NOW = '2026-07-17T12:00:00.000Z'

  it('first-ever run (backfill): seed-only rungs get achieved_on null, ALL missing rungs get notified_at = now', () => {
    // seed 30, no recorded dates yet -> only rung 25 achieved, entirely inside the seed.
    const rows = computeAwardRows('m1', 'run', 30, [], new Set(), NOW)
    expect(rows).toEqual([
      { member_id: 'm1', kind: 'run', rung: 10, achieved_on: null, notified_at: NOW },
      { member_id: 'm1', kind: 'run', rung: 25, achieved_on: null, notified_at: NOW },
    ])
  })

  it('backfill with live-era rungs: dates the (rung - seed)th recorded date, still notified_at = now (no existing rows yet)', () => {
    const dates = ['2026-05-07', '2026-05-14', '2026-05-21', '2026-05-28', '2026-06-04']
    // seed 5, 5 recorded dates -> total 10, rung 10 crossed on the (10-5)=5th date.
    const rows = computeAwardRows('m1', 'run', 5, dates, new Set(), NOW)
    expect(rows).toEqual([
      { member_id: 'm1', kind: 'run', rung: 10, achieved_on: '2026-06-04', notified_at: NOW },
    ])
  })

  it('a fresh crossing on a re-run (existing rows present) gets notified_at null', () => {
    // seed 5 + 20 recorded dates -> total 25, rung 10 already recorded (existing), rung 25 is new.
    const manyDates = Array.from({ length: 20 }, (_, i) => `2026-0${1 + Math.floor(i / 9)}-${String((i % 28) + 1).padStart(2, '0')}`)
    const rows = computeAwardRows('m1', 'run', 5, manyDates, new Set([10]), NOW)
    expect(rows).toEqual([
      { member_id: 'm1', kind: 'run', rung: 25, achieved_on: manyDates[19], notified_at: null },
    ])
  })

  it('idempotent: nothing missing writes nothing', () => {
    const rows = computeAwardRows('m1', 'run', 10, [], new Set([10]), NOW)
    expect(rows).toEqual([])
  })

  it('mixed backfill: rung inside the seed gets null date, a rung crossed live gets dated, both notified_at = now together', () => {
    const dates = [
      '2026-05-07', '2026-05-14', '2026-05-21', '2026-05-28', '2026-06-04',
      '2026-06-11', '2026-06-18', '2026-06-25', '2026-07-02', '2026-07-09',
    ]
    // seed 15 covers rung 10 only; 10 recorded dates -> total 25, rung 25 crossed
    // live on the (25-15)=10th recorded date.
    const rows = computeAwardRows('m1', 'run', 15, dates, new Set(), NOW)
    expect(rows).toEqual([
      { member_id: 'm1', kind: 'run', rung: 10, achieved_on: null, notified_at: NOW },
      { member_id: 'm1', kind: 'run', rung: 25, achieved_on: '2026-07-09', notified_at: NOW },
    ])
  })
})
