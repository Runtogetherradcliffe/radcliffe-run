/**
 * Regression tests for lib/buildEmail.ts.
 *
 * The route-link format test exists because a sent newsletter once built
 * links as /routes/<slug>, which 404s - the routes page selects routes
 * client-side from the URL hash, so links MUST be /routes#<slug>.
 */
import { describe, it, expect } from 'vitest'
import { buildEmailHtml, buildEmailText, type EmailData, type RunInfo } from '@/lib/buildEmail'

const SITE = 'https://radcliffe.run'

function makeRun(overrides: Partial<RunInfo> = {}): RunInfo {
  return {
    date: '2026-06-11',
    title: 'RTR 8k Burrs to Summerseat Loop',
    distance_km: 8,
    description: 'A scenic trail loop along the River Irwell.',
    route_slug: 'trail-8k--burrs-to-summerseat-loop',
    meeting_point: 'Radcliffe Market',
    meeting_map_url: null,
    on_tour: false,
    has_jeffing: false,
    terrain: 'trail',
    ...overrides,
  }
}

function makeEmail(overrides: Partial<EmailData> = {}): EmailData {
  return {
    subject: 'This week at RTR',
    showOpening: true,
    openingText: 'Hello runners!',
    runs: [makeRun()],
    showRouteBlock: true,
    customText: null,
    showClosing: true,
    closingText: 'See you Thursday.',
    siteUrl: SITE,
    ...overrides,
  }
}

describe('route links use the hash form, never the path form', () => {
  it('HTML links to /routes#<slug>', () => {
    const html = buildEmailHtml(makeEmail())
    expect(html).toContain(`${SITE}/routes#trail-8k--burrs-to-summerseat-loop`)
  })

  it('plain text links to /routes#<slug>', () => {
    const text = buildEmailText(makeEmail())
    expect(text).toContain(`${SITE}/routes#trail-8k--burrs-to-summerseat-loop`)
  })

  it('never emits a path-style /routes/<slug> link', () => {
    const html = buildEmailHtml(makeEmail())
    const text = buildEmailText(makeEmail())
    expect(html).not.toMatch(/\/routes\/[a-z0-9-]/i)
    expect(text).not.toMatch(/\/routes\/[a-z0-9-]/i)
  })

  it('falls back to /routes when a run has no slug', () => {
    const html = buildEmailHtml(makeEmail({ runs: [makeRun({ route_slug: null })] }))
    expect(html).toContain(`href="${SITE}/routes"`)
  })

  it('URL-encodes the slug in HTML links', () => {
    const html = buildEmailHtml(makeEmail({ runs: [makeRun({ route_slug: 'odd slug&chars' })] }))
    expect(html).toContain(`${SITE}/routes#odd%20slug%26chars`)
  })
})

describe('HTML escaping of sheet-sourced content', () => {
  it('escapes script tags in run titles', () => {
    const html = buildEmailHtml(makeEmail({ runs: [makeRun({ title: '<script>alert(1)</script>' })] }))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes HTML in run descriptions', () => {
    const html = buildEmailHtml(makeEmail({ runs: [makeRun({ description: 'Nice <b>route</b> & more' })] }))
    expect(html).toContain('Nice &lt;b&gt;route&lt;/b&gt; &amp; more')
  })

  it('rejects javascript: URLs for on-tour map links', () => {
    const html = buildEmailHtml(makeEmail({
      runs: [makeRun({ on_tour: true, meeting_map_url: 'javascript:alert(1)' })],
    }))
    expect(html).not.toContain('javascript:')
  })
})

describe('same-route merge (mirrors the homepage)', () => {
  // The 5k and 8k groups sometimes run the same named route. The homepage
  // collapses them into one card; the email used to print the description
  // twice. These runs share a title but differ in slug/distance.
  const fivek = makeRun({
    title: 'Outwood OAB',
    distance_km: 5,
    route_slug: 'trail-5k--outwood-oab',
    description: 'Head out through Outwood Country Park.',
    has_jeffing: true,
  })
  const eightk = makeRun({
    title: 'Outwood OAB',
    distance_km: 8,
    route_slug: 'trail-8k--outwood-oab',
    description: 'Head out through Outwood Country Park.',
  })

  it('prints the shared description only once in HTML', () => {
    const html = buildEmailHtml(makeEmail({ runs: [fivek, eightk] }))
    const count = html.split('Head out through Outwood Country Park.').length - 1
    expect(count).toBe(1)
  })

  it('prints the shared description only once in plain text', () => {
    const text = buildEmailText(makeEmail({ runs: [fivek, eightk] }))
    const count = text.split('Head out through Outwood Country Park.').length - 1
    expect(count).toBe(1)
  })

  it('shows both distances in the merged header', () => {
    const html = buildEmailHtml(makeEmail({ runs: [fivek, eightk] }))
    expect(html).toContain('5km &amp; 8km')
  })

  it('renders a single merged card, not two blocks', () => {
    const html = buildEmailHtml(makeEmail({ runs: [fivek, eightk] }))
    // The classic block is wrapped in a left-bordered cell; merged = one of them.
    const blocks = html.split('border-left:3px solid #f5a623').length - 1
    expect(blocks).toBe(1)
  })

  it('links the merged card to the longest run route', () => {
    const html = buildEmailHtml(makeEmail({ runs: [fivek, eightk] }))
    expect(html).toContain(`${SITE}/routes#trail-8k--outwood-oab`)
  })

  it('keeps the Run or Jeff badge on the merged card', () => {
    const html = buildEmailHtml(makeEmail({ runs: [fivek, eightk] }))
    expect(html).toContain('Run or Jeff')
  })

  it('does NOT merge two different routes on the same date', () => {
    const other = makeRun({
      title: 'Riverside 8k',
      route_slug: 'trail-8k--riverside',
      description: 'A different route entirely.',
    })
    const html = buildEmailHtml(makeEmail({ runs: [fivek, other] }))
    expect(html).toContain('Head out through Outwood Country Park.')
    expect(html).toContain('A different route entirely.')
    const blocks = html.split('border-left:3px solid #f5a623').length - 1
    expect(blocks).toBe(2)
  })
})

describe('unsubscribe placeholder', () => {
  it('is present in both HTML and text so the sender can personalise it', () => {
    expect(buildEmailHtml(makeEmail())).toContain('{{UNSUBSCRIBE_URL}}')
    expect(buildEmailText(makeEmail())).toContain('{{UNSUBSCRIBE_URL}}')
  })
})
