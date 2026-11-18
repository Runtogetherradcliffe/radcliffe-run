import { describe, expect, it } from 'vitest'
import { effectiveProgramme, sanitizeSessionOrder, sanitizeWeekOverrides, slotSession } from '@/lib/c25kProgramme'
import { buildC25kSessions } from '@/lib/c25kSessions'

describe('C25K weeks 6 and 7 in the admin\'s own words', () => {
  it('uses the NHS plan when nothing is set', () => {
    const w6 = effectiveProgramme(null, null).find(w => w.n === 6)!
    expect(w6.sessions[0].intervals).toMatch(/^5 min jog/)
    expect(w6.sessions[2].intervals).toBe('20 min non-stop')
  })

  it('applies the session order, then the rewritten runs', () => {
    const p = effectiveProgramme({ '6': [2, 0, 1] }, { '6': { thu: { intervals: '6 min jog, 2 min walk, 6 min jog', totalRun: '12 min running' } } })
    const w6 = p.find(w => w.n === 6)!
    expect(w6.sessions[0].intervals).toBe('20 min non-stop')           // order put run C on Tuesday
    expect(w6.sessions[1].intervals).toBe('6 min jog, 2 min walk, 6 min jog') // Thursday rewritten
    expect(w6.sessions[1].totalRun).toBe('12 min running')
  })

  it('never lets other weeks or bad input through', () => {
    expect(sanitizeWeekOverrides({ '3': { tue: { intervals: 'x', totalRun: 'y' } } })).toBeNull()
    expect(sanitizeWeekOverrides({ '6': { tue: { intervals: '   ', totalRun: '' } } })).toBeNull()
    expect(sanitizeWeekOverrides('nonsense')).toBeNull()
    const long = sanitizeWeekOverrides({ '7': { solo: { intervals: 'a'.repeat(500), totalRun: '' } } })!
    expect(long['7'].solo!.intervals).toHaveLength(200)
  })

  it('puts each session\'s run on the generated sessions', () => {
    const p = effectiveProgramme(null, { '6': { tue: { intervals: 'Hill reps', totalRun: '15 min running' } } })
    const rows = buildC25kSessions('2027-01-05', p)
    const w6tue = rows.find(r => r.key === 'c25k-2027:w06:tue')!
    expect(w6tue.description).toBe('Hill reps (15 min running)')
    const w1thu = rows.find(r => r.key === 'c25k-2027:w01:thu')!
    expect(w1thu.description).toMatch(/60s jog/)
    expect(rows.find(r => r.slot === 'grad')!.description).toMatch(/Heaton Park/)
  })

  it('gives single-run weeks the same run on every slot', () => {
    const w3 = effectiveProgramme(null, null).find(w => w.n === 3)!
    expect(slotSession(w3, 'thu')).toBe(slotSession(w3, 'tue'))
  })

  it('ignores a malformed session order instead of breaking the programme', () => {
    expect(sanitizeSessionOrder({ '6': [0, 0, 1], '7': [3, 1, 2], '3': [2, 1, 0] })).toBeNull()
    expect(sanitizeSessionOrder({ '6': [2, 0, 1] })).toEqual({ '6': [2, 0, 1] })
    const w6 = effectiveProgramme({ '6': [9, 9, 9] } as never, null).find(w => w.n === 6)!
    expect(w6.sessions.every(s => typeof s.intervals === 'string')).toBe(true)
  })

  it('week 5 is the bridge week, not a repeat of week 4', () => {
    const w5 = effectiveProgramme(null, null).find(w => w.n === 5)!
    expect(w5.title).toBe('Bridge week')
    expect(w5.title).not.toMatch(/repeat/i)
  })

  it('week 5 opens out into different runs per day, and its name can change', () => {
    const w5 = effectiveProgramme(null, { '5': {
      title: 'Bridge to 20 minutes',
      tue: { intervals: '15 min jog, 2 min walk, 3 min jog', totalRun: '18 min running' },
    } }).find(w => w.n === 5)!
    expect(w5.title).toBe('Bridge to 20 minutes')
    expect(w5.sessions).toHaveLength(3)
    expect(w5.sessions[0].intervals).toBe('15 min jog, 2 min walk, 3 min jog')
    expect(w5.sessions[1].intervals).toMatch(/^3 min jog/) // Thursday keeps the plan
  })

  it('week 5 stays one run when all three days are the same', () => {
    const same = { intervals: '15 min jog, 2 min walk, 5 min jog', totalRun: '20 min running' }
    const w5 = effectiveProgramme(null, { '5': { tue: same, thu: same, solo: same } }).find(w => w.n === 5)!
    expect(w5.sessions).toHaveLength(1)
    expect(w5.sessions[0].intervals).toBe(same.intervals)
    const rows = buildC25kSessions('2027-01-05', effectiveProgramme(null, { '5': { tue: same, thu: same, solo: same } }))
    expect(rows.find(r => r.key === 'c25k-2027:w05:thu')!.description).toBe('15 min jog, 2 min walk, 5 min jog (20 min running)')
  })
})
