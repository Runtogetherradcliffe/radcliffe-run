export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import StatsBand from '@/components/StatsBand'
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'
import { existsSync } from 'fs'
import { join } from 'path'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

/** Strip leading "RTR 5k / RTR 8k / RTR 5K" etc from run titles */
function cleanTitle(title: string) {
  return title.replace(/^RTR\s+[58]k\s*/i, '').trim()
}

function fmtRunDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const TERRAIN_BADGE: Record<string, React.CSSProperties> = {
  trail: { background: '#0d1a0d', color: '#7cb87c', border: '1px solid #1a3a1a' },
  road:  { background: '#0d1221', color: '#6b9fd4', border: '1px solid #1a2a44' },
  mixed: { background: '#1a1208', color: '#d4a84b', border: '1px solid #3a2a0a' },
}

function TerrainBadge({ terrain }: { terrain: 'trail' | 'road' | 'mixed' }) {
  return (
    <span style={{
      ...TERRAIN_BADGE[terrain],
      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
      textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5,
    }}>
      {terrain}
    </span>
  )
}

const MOOD_STYLES: Record<string, { bg: string; glow: string; path: string }> = {
  trail:  { bg: 'linear-gradient(160deg,#071208,#0d200d,#0a160a)', glow: 'rgba(124,184,124,0.35)',  path: 'M0 60 Q80 20 160 45 Q240 70 320 30 Q360 15 400 40 L400 100 L0 100 Z' },
  road:   { bg: 'linear-gradient(160deg,#080d1c,#0d1635,#0a0e24)', glow: 'rgba(107,159,212,0.35)',  path: 'M0 80 Q100 60 200 75 Q300 90 400 65 L400 100 L0 100 Z' },
  golden: { bg: 'linear-gradient(160deg,#1c0e04,#2a1808,#180e04)', glow: 'rgba(245,166,35,0.50)',   path: 'M0 50 Q60 30 140 55 Q220 80 300 40 Q350 20 400 50 L400 100 L0 100 Z' },
  group:  { bg: 'linear-gradient(160deg,#1a1004,#281c08,#1a1004)', glow: 'rgba(212,168,75,0.38)',   path: 'M0 70 Q120 40 240 60 Q320 70 400 50 L400 100 L0 100 Z' },
  dusk:   { bg: 'linear-gradient(160deg,#100a20,#1c1030,#120a1c)', glow: 'rgba(196,168,232,0.40)',  path: 'M0 65 Q100 35 200 55 Q300 75 400 45 L400 100 L0 100 Z' },
}

function PhotoPlaceholder({ mood = 'trail', style = {} }: { mood?: string; style?: React.CSSProperties }) {
  const m = MOOD_STYLES[mood] || MOOD_STYLES.trail
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: m.bg, ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 100% 60% at 50% 100%, ${m.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '45%' }} viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d={m.path} fill="rgba(0,0,0,0.45)" />
      </svg>
    </div>
  )
}

const TERRAIN_CARD_STYLE: Record<string, { bg: string; glow: string }> = {
  trail:  { bg: 'linear-gradient(160deg,#071208,#0d200d,#0a160a)', glow: 'rgba(124,184,124,0.3)'  },
  road:   { bg: 'linear-gradient(160deg,#080d1c,#0d1635,#0a0e24)', glow: 'rgba(107,159,212,0.3)'  },
  mixed:  { bg: 'linear-gradient(160deg,#1a1208,#2a1e0a,#180e04)', glow: 'rgba(212,168,75,0.3)'   },
  social: { bg: 'linear-gradient(160deg,#100a20,#1c1030,#120a1c)', glow: 'rgba(196,168,232,0.35)' },
  walk:   { bg: 'linear-gradient(160deg,#061818,#0a2020,#061818)', glow: 'rgba(78,205,196,0.3)'   },
  c25k:   { bg: 'linear-gradient(160deg,#180618,#200a20,#180618)', glow: 'rgba(218,130,218,0.3)'  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isRegistered = !!user
  const today = new Date().toISOString().split('T')[0]

  const fourWeeksOut = new Date()
  fourWeeksOut.setDate(fourWeeksOut.getDate() + 28)
  const fourWeeksOutStr = fourWeeksOut.toISOString().split('T')[0]

  // Site settings — use service role so it works for both anon and authenticated visitors
  const { data: siteSettings } = await supabaseAdmin()
    .from('site_settings')
    .select('hero_image_url, sync_social_sheet, show_social_calendar')
    .single()
  const heroImageUrl        = siteSettings?.hero_image_url ?? null
  const showSocialRuns      = siteSettings?.sync_social_sheet ?? true
  const showSocialCalendar  = siteSettings?.show_social_calendar ?? false

  // Thursday runs (all types except social)
  const { data: thursdayRuns } = await supabase
    .from('runs')
    .select('id, date, title, distance_km, terrain, meeting_point, route_slug, on_tour, has_jeffing, run_type, cancelled')
    .gte('date', today)
    .lte('date', fourWeeksOutStr)
    .eq('cancelled', false)
    .neq('run_type', 'social')
    .order('date', { ascending: true })
    .order('distance_km', { ascending: false })

  // Social runs (separate query, only if toggle is on)
  const { data: socialRunsData } = showSocialRuns
    ? await supabase
        .from('runs')
        .select('id, date, title, distance_km, terrain, meeting_point, route_slug, on_tour, has_jeffing, run_type, cancelled')
        .gte('date', today)
        .eq('cancelled', false)
        .eq('run_type', 'social')
        .order('date', { ascending: true })
        .limit(4)
    : { data: [] }

  // All runs on the very next Thursday date (may be 1, 2 or more groups)
  const nextRunDate  = thursdayRuns?.[0]?.date ?? null
  const nextWeekRuns = nextRunDate ? (thursdayRuns ?? []).filter(r => r.date === nextRunDate) : []
  const runCards     = thursdayRuns ?? []
  const socialRuns   = socialRunsData ?? []

  // Latest posts for homepage feed
  const { data: latestPosts } = await supabaseAdmin()
    .from('posts')
    .select('id, type, title, summary, slug, published_at, photo_urls')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(3)

  return (
    <>
      <Nav />
      <main>

        {/* ── HERO ── */}
        <section className="rtr-hero">

          <div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5a623' }}>
                Radcliffe &middot; Greater Manchester &middot; Est. 2022
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(52px, 6.5vw, 86px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 24 }}>
              Every<br />Thursday.<br /><span style={{ color: '#f5a623' }}>Free.</span>
            </h1>

            <p style={{ fontSize: 17, fontWeight: 300, color: '#aaa', lineHeight: 1.8, maxWidth: 420, marginBottom: 28 }}>
              A running group open to everyone &mdash; no memberships, no minimum pace. Just good routes and good people, every week in Radcliffe.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 36 }}>
              {['7pm start', 'Radcliffe Market', 'All abilities'].map(tag => (
                <span key={tag} style={{ fontSize: 12, color: '#888', border: '1px solid #1a1a1a', borderRadius: 20, padding: '4px 12px' }}>{tag}</span>
              ))}
            </div>

            {!isRegistered && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/join" style={{ display: 'inline-flex', alignItems: 'center', background: '#f5a623', color: '#0a0a0a', fontSize: 14, fontWeight: 700, padding: '12px 24px', borderRadius: 8, textDecoration: 'none' }}>
                Join the group
              </Link>
              <Link href="/signin" style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: '#7cb87c', fontSize: 14, fontWeight: 500, padding: '12px 24px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(124,184,124,0.3)' }}>
                Sign in
              </Link>
            </div>
            )}
            {!isRegistered && (
              <p style={{ fontSize: 13, color: '#555', marginTop: 14, lineHeight: 1.6 }}>
                No need to book — just turn up. We ask you to join so we have your contact details in case of an emergency.
              </p>
            )}
          </div>

          {/* Hero image panel + this week's runs card */}
          <div className="rtr-hero-image-panel" style={{ position: 'relative', borderRadius: 16, overflow: 'visible' }}>

            {/* Image or gradient placeholder */}
            <div style={{ borderRadius: 16, overflow: 'hidden', height: 420, position: 'relative' }}>
              {heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImageUrl}
                  alt="RTR group running"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <PhotoPlaceholder mood="golden" style={{ height: '100%' }} />
              )}
              {/* Gradient overlay — bottom fade for card legibility */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0) 40%, rgba(10,10,10,0.75) 100%)', pointerEvents: 'none' }} />
            </div>

            {/* This week's runs card */}
            {nextWeekRuns.length > 0 && (
              <div style={{ position: 'absolute', bottom: -20, left: -20, right: 20, background: 'rgba(17,17,17,0.96)', backdropFilter: 'blur(12px)', borderLeft: '3px solid #f5a623', borderRadius: '0 12px 12px 0', padding: '16px 20px', boxShadow: '0 16px 48px rgba(0,0,0,0.7)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 12 }}>
                  This week &middot; {fmtRunDate(nextWeekRuns[0].date)} &middot; 7pm
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nextWeekRuns.map(run => {
                    const slug = run.route_slug
                    const group = slug?.startsWith('trail-5k--') || slug?.startsWith('road-5k--') ? '5K'
                               : slug?.startsWith('trail-8k--') || slug?.startsWith('road-8k--') ? '8K'
                               : null
                    const groupColor = group === '5K' ? '#4caf76' : group === '8K' ? '#5b9bd5' : '#888'
                    return (
                      <Link key={run.id} href={`/runs/${run.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          {group && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: groupColor, border: `1px solid ${groupColor}`, borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                              {group}
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cleanTitle(run.title)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                          {run.distance_km && <span style={{ fontSize: 12, color: '#555' }}>{run.distance_km} km</span>}
                          <span style={{ fontSize: 12, color: '#666' }}>→</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#555' }}>📍</span>
                  <span style={{ fontSize: 12, color: '#555' }}>
                    {nextWeekRuns[0].on_tour ? nextWeekRuns[0].meeting_point : 'Radcliffe Market'}
                    {nextWeekRuns.length > 1 && nextWeekRuns[1].on_tour && nextWeekRuns[0].meeting_point !== nextWeekRuns[1].meeting_point
                      ? ` · ${nextWeekRuns[1].meeting_point}` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <StatsBand routeCount={ROUTES.length} />

        {/* ── UPCOMING RUNS ── */}
        {(() => {
          // Merge same-route pairs: when two runs on the same date share a route_slug,
          // collapse them into one card showing both distance groups
          type RunItem = NonNullable<typeof runCards>[number]
          type Card = { primary: RunItem; companion?: RunItem }
          const cards: Card[] = []
          const seen = new Set<string>()
          for (const run of runCards) {
            if (seen.has(run.id)) continue
            // Merge two runs on the same date if they share the same route_slug OR the same title
            // (same title = both groups running the same named route, e.g. "Outwood OAB")
            const companion = runCards.find(r =>
              !seen.has(r.id) && r.id !== run.id && r.date === run.date && (
                (run.route_slug && r.route_slug && run.route_slug === r.route_slug) ||
                run.title === r.title
              )
            )
            if (companion) {
              // Put the shorter run as primary
              const [shorter, longer] = (run.distance_km ?? 0) <= (companion.distance_km ?? 0)
                ? [run, companion] : [companion, run]
              cards.push({ primary: shorter, companion: longer })
              seen.add(run.id); seen.add(companion.id)
              continue
            }
            cards.push({ primary: run })
            seen.add(run.id)
          }

          return (
            <section className="rtr-section">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 8 }}>On the schedule</p>
                  <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>Upcoming runs</h2>
                </div>
                <Link href="/routes" style={{ fontSize: 13, fontWeight: 500, color: '#555', textDecoration: 'none' }}>View all routes →</Link>
              </div>

              {/* Calendar subscription */}
              <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '14px 18px', background: '#111', border: '1px solid #1e1e1e', borderRadius: 10 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 2 }}>Never miss a run</p>
                  <p style={{ fontSize: 12, color: '#555' }}>Subscribe and every run appears automatically in your phone&apos;s calendar</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href="webcal://calendar.google.com/calendar/ical/1e8d26a3b27472c802fdf9e914db1577e4eddae7cbf3b1f6a4f30984626bc7df%40group.calendar.google.com/public/basic.ics"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, background: '#f5a623', color: '#0a0a0a', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    Thursday runs →
                  </a>
                  {showSocialCalendar && (
                    <a
                      href="webcal://calendar.google.com/calendar/ical/fba15c422774be22b6adc0b5565205dd878a70d4a6a738fe3ff2fae1d08ac215%40group.calendar.google.com/public/basic.ics"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, background: 'transparent', color: '#888', fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid #222', whiteSpace: 'nowrap' }}
                    >
                      Social runs →
                    </a>
                  )}
                </div>
              </div>

              <div className="rtr-cards-grid">
                {cards.length === 0 ? (
                  <p style={{ color: '#555', fontSize: 14 }}>No upcoming runs scheduled yet.</p>
                ) : cards.map(({ primary: run, companion }) => {
                  const linkedRoute = run.route_slug ? ROUTES.find(r => r.slug === run.route_slug) : null

                  // Derive group label from slug prefix
                  function groupLabel(slug: string | null) {
                    if (!slug) return null
                    if (slug.startsWith('trail-5k--') || slug.startsWith('road-5k--')) return '5K'
                    if (slug.startsWith('trail-8k--') || slug.startsWith('road-8k--')) return '8K'
                    return null
                  }
                  const primaryGroup   = groupLabel(run.route_slug)
                  const companionGroup = companion ? groupLabel(companion.route_slug) : null

                  const GROUP_BADGE: Record<string, React.CSSProperties> = {
                    '5K': { background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(76,175,118,0.6)', color: '#4caf76' },
                    '8K': { background: 'rgba(10,10,10,0.8)', border: '1px solid rgba(91,155,213,0.6)', color: '#5b9bd5' },
                  }
                  const cardKey = (['walk','c25k'].includes(run.run_type)) ? run.run_type
                                : run.run_type === 'social' ? 'social'
                                : (run.terrain ?? 'trail')
                  const cardStyle = TERRAIN_CARD_STYLE[cardKey] ?? TERRAIN_CARD_STYLE.trail
                  const isTwoGroups = !!companion

                  // Check if a route map image exists for this card
                  // For two-group cards use the longer run's slug (more route to show)
                  const mapSlug = isTwoGroups
                    ? (companion!.route_slug ?? run.route_slug)
                    : run.route_slug
                  const hasMap = !!mapSlug && existsSync(
                    join(process.cwd(), 'public', 'route-maps', `${mapSlug}.png`)
                  )
                  const headerHeight = hasMap ? 160 : 100

                  // Card border colour keyed on group
                  const cardBorder = primaryGroup === '5K'
                    ? '1px solid rgba(76,175,118,0.25)'
                    : primaryGroup === '8K'
                    ? '1px solid rgba(91,155,213,0.25)'
                    : run.run_type === 'social'
                    ? '1px solid rgba(196,168,232,0.2)'
                    : '1px solid #1e1e1e'

                  return (
                    <div key={run.id} style={{ background: '#111', border: cardBorder, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                        {/* ── Card header: map image or gradient fallback ── */}
                        <div style={{ height: headerHeight, position: 'relative', overflow: 'hidden', background: cardStyle.bg }}>

                          {hasMap ? (
                            /* Map image — full cover */
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/route-maps/${mapSlug}.png`}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                              {/* Bottom fade to blend into card body */}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to bottom, transparent, #111)', pointerEvents: 'none' }} />
                            </>
                          ) : (
                            /* Gradient fallback */
                            <>
                              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 100% 70% at 50% 100%, ${cardStyle.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
                              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
                              {/* Faint distance watermark */}
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isTwoGroups ? (
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.1)', letterSpacing: '-0.04em' }}>{run.distance_km}</span>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.06)' }}>/</span>
                                    <span style={{ fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.1)', letterSpacing: '-0.04em' }}>{companion!.distance_km}</span>
                                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.05)' }}>km</span>
                                  </div>
                                ) : run.distance_km ? (
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                                    <span style={{ fontSize: 38, fontWeight: 800, color: 'rgba(255,255,255,0.1)', letterSpacing: '-0.04em' }}>{run.distance_km}</span>
                                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.06)' }}>km</span>
                                  </div>
                                ) : null}
                              </div>
                            </>
                          )}

                          {/* Badges — always on top */}
                          {run.on_tour && (
                            <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(10,10,10,0.75)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#f5a623', letterSpacing: '0.06em' }}>
                              ON TOUR
                            </span>
                          )}
                          {run.run_type === 'social' && !run.on_tour && (
                            <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(10,10,10,0.75)', border: '1px solid rgba(196,168,232,0.5)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#c4a8e8', letterSpacing: '0.06em' }}>
                              SOCIAL
                            </span>
                          )}
                          {run.run_type === 'walk' && (
                            <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(10,10,10,0.75)', border: '1px solid rgba(78,205,196,0.5)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#4ecdc4', letterSpacing: '0.06em' }}>
                              WALK
                            </span>
                          )}
                          {run.run_type === 'c25k' && (
                            <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(10,10,10,0.75)', border: '1px solid rgba(218,130,218,0.5)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#da82da', letterSpacing: '0.06em' }}>
                              C25K
                            </span>
                          )}
                          {isTwoGroups && (
                            <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(10,10,10,0.75)', border: '1px solid rgba(245,166,35,0.5)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#f5a623', letterSpacing: '0.06em' }}>
                              2 GROUPS
                            </span>
                          )}
                        </div>

                        {/* ── Card body ── */}
                        <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 6 }}>
                            {fmtRunDate(run.date)} &middot; 7pm
                          </p>
                          <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                            {cleanTitle(run.title)}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 12, color: '#555' }}>📍 {run.on_tour ? run.meeting_point.split(',')[0] : 'Radcliffe Market'}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isTwoGroups ? (
                                <span style={{ fontSize: 12, color: '#666' }}>{run.distance_km}/{companion!.distance_km} km</span>
                              ) : run.distance_km ? (
                                <span style={{ fontSize: 12, color: '#666' }}>{run.distance_km} km</span>
                              ) : null}
                              {run.terrain && <TerrainBadge terrain={run.terrain} />}
                            </div>
                          </div>

                          {/* Group links — pinned to bottom */}
                          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {isTwoGroups ? (
                            <>
                              {/* 5K group (primary / shorter) — always first */}
                              {primaryGroup && (
                                <Link href={`/runs/${run.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', borderRadius: 6, textDecoration: 'none', ...(GROUP_BADGE[primaryGroup] ?? {}) }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(76,175,118,0.2)', border: '1px solid rgba(76,175,118,0.4)', borderRadius: 3, padding: '1px 5px', color: '#4caf76' }}>5–6k</span>
                                    {run.has_jeffing && (
                                      <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 3, padding: '1px 5px', color: '#f5a623' }}>Jeffing (run/walk)</span>
                                    )}
                                    <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(76,175,118,0.1)', border: '1px solid rgba(76,175,118,0.25)', borderRadius: 3, padding: '1px 5px', color: '#4caf76' }}>Continuous running</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                                    <span>{run.has_jeffing ? 'Get Me Started / Keep Me Going' : 'Keep Me Going'}</span>
                                    <span>→</span>
                                  </div>
                                </Link>
                              )}
                              {/* 8K group (companion / longer) — always second */}
                              {companionGroup && companion && (
                                <Link href={`/runs/${companion.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', borderRadius: 6, textDecoration: 'none', ...(GROUP_BADGE[companionGroup] ?? {}) }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(91,155,213,0.2)', border: '1px solid rgba(91,155,213,0.4)', borderRadius: 3, padding: '1px 5px', color: '#5b9bd5' }}>8–10k</span>
                                    <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(91,155,213,0.1)', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 3, padding: '1px 5px', color: '#5b9bd5' }}>Continuous running</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                                    <span>Challenge Me</span>
                                    <span>→</span>
                                  </div>
                                </Link>
                              )}
                            </>
                          ) : (
                            <Link href={`/runs/${run.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', borderRadius: 6, textDecoration: 'none', ...(primaryGroup ? GROUP_BADGE[primaryGroup] : { background: 'rgba(255,255,255,0.04)', border: '1px solid #222', color: '#888' }) }}>
                              {primaryGroup && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                                  {primaryGroup === '5K' && (
                                    <>
                                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(76,175,118,0.2)', border: '1px solid rgba(76,175,118,0.4)', borderRadius: 3, padding: '1px 5px', color: '#4caf76' }}>5–6k</span>
                                      {run.has_jeffing && (
                                        <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(245,166,35,0.12)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 3, padding: '1px 5px', color: '#f5a623' }}>Jeffing (run/walk)</span>
                                      )}
                                      <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(76,175,118,0.1)', border: '1px solid rgba(76,175,118,0.25)', borderRadius: 3, padding: '1px 5px', color: '#4caf76' }}>Continuous running</span>
                                    </>
                                  )}
                                  {primaryGroup === '8K' && (
                                    <>
                                      <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(91,155,213,0.2)', border: '1px solid rgba(91,155,213,0.4)', borderRadius: 3, padding: '1px 5px', color: '#5b9bd5' }}>8–10k</span>
                                      <span style={{ fontSize: 9, fontWeight: 600, background: 'rgba(91,155,213,0.1)', border: '1px solid rgba(91,155,213,0.25)', borderRadius: 3, padding: '1px 5px', color: '#5b9bd5' }}>Continuous running</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>
                                <span>{primaryGroup === '5K'
                                  ? run.has_jeffing ? 'Get Me Started / Keep Me Going' : 'Keep Me Going'
                                  : primaryGroup === '8K' ? 'Challenge Me' : 'View details'}</span>
                                <span>→</span>
                              </div>
                            </Link>
                          )}
                          </div>
                        </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* ── SOCIAL RUNS ── */}
        {socialRuns.length > 0 && (
          <div style={{ background: '#0f0a1e', borderTop: '1px solid #1a1030' }}>
            <section className="rtr-section">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c4a8e8', marginBottom: 8 }}>Beyond Thursdays</p>
                  <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>Social runs</h2>
                </div>
              </div>
              <div className="rtr-cards-grid">
                {socialRuns.map(run => {
                  const socialHasMap = !!run.route_slug && existsSync(
                    join(process.cwd(), 'public', 'route-maps', `${run.route_slug}.png`)
                  )
                  const socialHeaderHeight = socialHasMap ? 160 : 80
                  return (
                  <div key={run.id} style={{ background: '#111', border: '1px solid rgba(196,168,232,0.15)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: socialHeaderHeight, position: 'relative', background: 'linear-gradient(160deg,#100a20,#1c1030,#120a1c)', overflow: 'hidden' }}>
                      {socialHasMap ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/route-maps/${run.route_slug}.png`}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to bottom, transparent, #111)', pointerEvents: 'none' }} />
                        </>
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 100% 70% at 50% 100%, rgba(196,168,232,0.35) 0%, transparent 70%)' }} />
                      )}
                      <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(10,10,10,0.75)', border: '1px solid rgba(196,168,232,0.5)', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#c4a8e8', letterSpacing: '0.06em' }}>
                        SOCIAL
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c4a8e8', marginBottom: 6 }}>
                        {fmtRunDate(run.date)}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
                        {cleanTitle(run.title)}
                      </p>
                      <p style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>📍 {run.meeting_point.split(',')[0]}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        {run.distance_km && <span style={{ fontSize: 12, color: '#666' }}>{run.distance_km} km</span>}
                        {run.terrain && <TerrainBadge terrain={run.terrain} />}
                      </div>
                      <div style={{ marginTop: 'auto' }}>
                        <Link href={`/runs/${run.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 700, background: 'rgba(196,168,232,0.08)', border: '1px solid rgba(196,168,232,0.2)', color: '#c4a8e8' }}>
                          <span>View details</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </section>
          </div>
        )}

        {/* ── LATEST FROM RTR ── */}
        {(latestPosts ?? []).length > 0 && (
          <div style={{ background: '#070707' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.02em' }}>From the group</h2>
                <Link href="/news" style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', textDecoration: 'none' }}>
                  All posts →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {(latestPosts ?? []).map(post => {
                  const postSlug = post.slug ?? post.id
                  const typeColor = post.type === 'roundup' ? '#f5a623' : '#6b9fd4'
                  const typeLabel = post.type === 'roundup' ? 'Weekly roundup' : 'News'
                  const dateStr = post.published_at
                    ? (() => { const d = new Date(post.published_at + 'T00:00:00Z'); return `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]}` })()
                    : null
                  const coverPhoto = post.photo_urls?.[0] ?? null
                  return (
                    <Link key={post.id} href={`/news/${postSlug}`} style={{ display: 'block', textDecoration: 'none', background: '#111', border: '1px solid #1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
                      {coverPhoto && (
                        <div style={{ height: 160, overflow: 'hidden' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      )}
                      <div style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: typeColor }}>{typeLabel}</span>
                          {dateStr && <span style={{ fontSize: 10, color: '#444' }}>{dateStr}</span>}
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#ddd', lineHeight: 1.3, marginBottom: post.summary ? 8 : 0 }}>{post.title}</p>
                        {post.summary && (
                          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.summary}</p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── JOIN CTA (green) ── */}
        {!isRegistered && <div style={{ background: '#0a120a' }}>
          <div className="rtr-cta-section">
            <div style={{ background: 'linear-gradient(135deg, #061408, #0a1a0e)', border: '1px solid rgba(124,184,124,0.2)', borderRadius: 16, padding: '64px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(124,184,124,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7cb87c', marginBottom: 16, position: 'relative' }}>Come and run with us</p>
              <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, position: 'relative' }}>Register &mdash; it&apos;s free</h2>
              <p style={{ fontSize: 16, fontWeight: 300, color: '#aaa', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px', position: 'relative', lineHeight: 1.7 }}>
                Join hundreds of Radcliffe runners. We only keep what we need to keep you safe on runs.
              </p>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Link href="/join" style={{ display: 'inline-flex', alignItems: 'center', background: '#f5a623', color: '#0a0a0a', fontSize: 15, fontWeight: 700, padding: '14px 36px', borderRadius: 8, textDecoration: 'none' }}>
                  Register &mdash; it&apos;s free
                </Link>
                <Link href="/signin" style={{ display: 'inline-flex', alignItems: 'center', background: 'transparent', color: '#7cb87c', fontSize: 14, fontWeight: 500, padding: '14px 24px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(124,184,124,0.3)' }}>
                  Already registered? Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>}

      </main>
      <Footer />
    </>
  )
}
