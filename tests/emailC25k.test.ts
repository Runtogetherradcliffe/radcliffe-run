import { describe, expect, it } from 'vitest'
import { buildEmailHtml, buildEmailText, type RunInfo } from '@/lib/buildEmail'
import { isC25kEmail } from '@/lib/emailRuns'

const base = {
  subject: 'Week 3', showOpening: false, openingText: '', showRouteBlock: true,
  customText: null, showClosing: false, closingText: '', siteUrl: 'https://www.radcliffe.run',
}
const session = (over: Partial<RunInfo>): RunInfo => ({
  date: '2027-01-19', title: 'C25K week 3 - Tuesday', distance_km: null, description: null, route_slug: null,
  meeting_point: 'Aldi, Higher Lane, Whitefield, M45 7EA', meeting_map_url: null, on_tour: false,
  has_jeffing: false, terrain: null, run_type: 'c25k', start_time: null, ...over,
})

describe('C25K sessions in the weekly email', () => {
  it('only the cohort email shows C25K sessions', () => {
    expect(isC25kEmail('c25k')).toBe(true)
    expect(isC25kEmail('all')).toBe(false)
    expect(isC25kEmail('selected')).toBe(false)
    expect(isC25kEmail(null)).toBe(false)
  })

  it('links a session to the programme, not a route, and keeps 7pm', () => {
    const html = buildEmailHtml({ ...base, runs: [session({})] })
    expect(html).toContain('/c25k/programme')
    expect(html).toContain('Your C25K programme')
    expect(html).not.toContain('View route details')
    expect(html).toContain('7pm')
  })

  it('gives graduation its own start time', () => {
    const grad = session({ date: '2027-03-13', title: 'C25K graduation - Heaton Park parkrun', meeting_point: 'Heaton Park parkrun', start_time: '09:00' })
    expect(buildEmailHtml({ ...base, runs: [grad] })).toContain('9:00am')
    expect(buildEmailText({ ...base, runs: [grad] })).toContain('9:00am')
  })

  it('leaves club runs as they were', () => {
    const club = session({ title: 'Outwood OAB', run_type: 'regular', route_slug: 'trail-5k--outwood-oab', distance_km: 5, meeting_point: 'Radcliffe Market' })
    const html = buildEmailHtml({ ...base, runs: [club] })
    expect(html).toContain('View route details')
    expect(html).toContain('7pm')
  })
})
