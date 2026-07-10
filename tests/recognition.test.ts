import { describe, it, expect } from 'vitest'
import { rungsAchieved, nextRung, COUNTED_RUN_TYPES } from '@/lib/recognition'

// Ladder: 10 / 25 / 50 / 100, then every 100th (parkrun's newer model).
// Decision record: docs/ATTENDANCE_RECOGNITION_BRIEF.md (10 Jul 2026).
describe('rungsAchieved', () => {
  it('nothing below 10', () => {
    expect(rungsAchieved(0)).toEqual([])
    expect(rungsAchieved(9)).toEqual([])
  })

  it('early rungs at 10/25/50', () => {
    expect(rungsAchieved(10)).toEqual([10])
    expect(rungsAchieved(24)).toEqual([10])
    expect(rungsAchieved(25)).toEqual([10, 25])
    expect(rungsAchieved(50)).toEqual([10, 25, 50])
    expect(rungsAchieved(99)).toEqual([10, 25, 50])
  })

  it('every 100th from 100 (the chain continues)', () => {
    expect(rungsAchieved(100)).toEqual([10, 25, 50, 100])
    expect(rungsAchieved(199)).toEqual([10, 25, 50, 100])
    expect(rungsAchieved(200)).toEqual([10, 25, 50, 100, 200])
    expect(rungsAchieved(555)).toEqual([10, 25, 50, 100, 200, 300, 400, 500])
  })

  it('launch-day leader seeds land on real rungs (Ken 131, Paul 160)', () => {
    expect(rungsAchieved(131)).toEqual([10, 25, 50, 100])
    expect(rungsAchieved(160)).toEqual([10, 25, 50, 100])
  })
})

describe('nextRung', () => {
  it('walks the early ladder', () => {
    expect(nextRung(0)).toBe(10)
    expect(nextRung(10)).toBe(25)
    expect(nextRung(25)).toBe(50)
    expect(nextRung(50)).toBe(100)
  })

  it('then every 100th', () => {
    expect(nextRung(100)).toBe(200)
    expect(nextRung(131)).toBe(200)
    expect(nextRung(200)).toBe(300)
    expect(nextRung(999)).toBe(1000)
  })
})

describe('counting scope', () => {
  it('counts regular + c25k only (socials/walks never count)', () => {
    expect(COUNTED_RUN_TYPES).toEqual(['regular', 'c25k'])
  })
})
