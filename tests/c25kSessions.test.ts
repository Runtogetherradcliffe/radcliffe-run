import { describe, expect, it } from 'vitest'
import { buildC25kSessions, isTuesday } from '@/lib/c25kSessions'

describe('buildC25kSessions', () => {
  const rows = buildC25kSessions('2027-01-05')

  it('makes a Tuesday and a Thursday for 10 weeks, plus graduation', () => {
    expect(rows).toHaveLength(21)
    expect(rows.filter(r => r.slot === 'tue')).toHaveLength(10)
    expect(rows.filter(r => r.slot === 'thu')).toHaveLength(10)
    expect(rows.filter(r => r.slot === 'grad')).toHaveLength(1)
  })

  it('dates the January 2027 cohort as agreed', () => {
    expect(rows[0]).toMatchObject({ date: '2027-01-05', title: 'C25K week 1 - Tuesday', key: 'c25k-2027:w01:tue' })
    expect(rows[1]).toMatchObject({ date: '2027-01-07', title: 'C25K week 1 - Thursday', key: 'c25k-2027:w01:thu' })
    const grad = rows.find(r => r.slot === 'grad')!
    expect(grad).toMatchObject({ date: '2027-03-13', start_time: '09:00', key: 'c25k-2027:w10:grad' })
    expect(rows.filter(r => r.slot === 'thu').map(r => r.date).at(-1)).toBe('2027-03-11')
  })

  it('leaves Tuesday and Thursday on the club convention time and meets at the right places', () => {
    for (const r of rows.filter(r => r.slot !== 'grad')) expect(r.start_time).toBeNull()
    expect(rows[0].meeting_point).toMatch(/Aldi/)
    expect(rows[1].meeting_point).toMatch(/Radcliffe Market/)
  })

  it('keys stay the same when the start date moves within the year', () => {
    const moved = buildC25kSessions('2027-01-12')
    expect(moved.map(r => r.key)).toEqual(rows.map(r => r.key))
    expect(moved[0].date).toBe('2027-01-12')
  })

  it('refuses a start date that is not a Tuesday', () => {
    expect(() => buildC25kSessions('2027-01-06')).toThrow(/Tuesday/)
    expect(() => buildC25kSessions('not a date')).toThrow(/Tuesday/)
    expect(isTuesday('2027-02-30')).toBe(false)
  })
})
