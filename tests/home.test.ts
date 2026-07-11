import { describe, it, expect } from 'vitest'
import { usualGroupFromCounts, type GroupCounts } from '@/lib/home'

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
