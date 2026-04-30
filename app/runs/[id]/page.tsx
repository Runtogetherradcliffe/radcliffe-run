import { notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import { supabaseAdmin } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'
import RunMapExpand from './RunMapExpand'
import RunBadges from './RunBadges'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtRunDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function cleanTitle(title: string) {
  return title.replace(/^RTR\s+[58]k\s*/i, '').trim()
}

/** Trim the long default address to just the venue name */
function shortMeetingPoint(mp: string) {
  return mp.split(',')[0].trim()
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: run } = await supabaseAdmin()
    .from('runs')
    .select('id, date, title, description, distance_km, terrain, meeting_point, meeting_map_url, route_slug, on_tour, has_jeffing, run_type, cancelled, leader_name')
    .eq('id', id)
    .single()

  if (!run) notFound()

  const title  = cleanTitle(run.title)
  const route  = run.route_slug ? ROUTES.find(r => r.slug === run.route_slug) : null
  const slug   = run.route_slug
  const group  = slug?.startsWith('trail-5k--') || slug?.startsWith('road-5k--') ? '5K'
               : slug?.startsWith('trail-8k--') || slug?.startsWith('road-8k--') ? '8K' : null
  const isSocial = run.run_type === 'social'

  const groupColor  = group === '5K' ? '#4caf76' : group === '8K' ? '#5b9bd5' : null
  const accentColor = isSocial ? '#c4a8e8' : '#f5a623'

  const meetingPoint = run.on_tour || isSocial
    ? shortMeetingPoint(run.meeting_point)
    : 'Radcliffe Market'

  return (
    <>
      <Nav />
      <main style={{ minHeight: '100vh' }}>
        <section style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 80px' }}>

          {/* Back */}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', textDecoration: 'none', marginBottom: 40 }}>
            ← Upcoming runs
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: accentColor }}>
                {isSocial ? 'Social run' : 'Thursday run'}
              </span>
              <span style={{ fontSize: 11, color: '#333' }}>·</span>
              <span style={{ fontSize: 11, color: '#777' }}>{fmtRunDate(run.date)}</span>
              {!isSocial && <><span style={{ fontSize: 11, color: '#333' }}>·</span><span style={{ fontSize: 11, color: '#777' }}>7pm</span></>}
            </div>

            <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
              {title}
            </h1>

            <RunBadges
              group={group}
              hasJeffing={run.has_jeffing ?? false}
              groupColor={groupColor}
              terrain={run.terrain}
              onTour={run.on_tour ?? false}
              accentColor={accentColor}
            />
          </div>

          {/* Meeting point */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 10 }}>
              Meeting point
            </p>
            <p style={{ fontSize: 14, color: '#ccc', lineHeight: 1.5, marginBottom: run.meeting_map_url ? 14 : 0 }}>
              📍 {(!run.on_tour && !isSocial)
                ? <a href="https://maps.app.goo.gl/d1FUYuqmNVpsWUs99" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Radcliffe Market</a>
                : meetingPoint}
            </p>
            {run.meeting_map_url && (
              <a
                href={run.meeting_map_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, fontWeight: 600, color: accentColor, textDecoration: 'none' }}
              >
                Open in maps →
              </a>
            )}
          </div>

          {/* Route description (from lib/routes.ts) */}
          {route?.description && (
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 10 }}>
                About this route
              </p>
              <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.75 }}>{route.description}</p>
              <div style={{ marginTop: 14 }}>
                <RunMapExpand
                  file={route.file}
                  accentColor={accentColor}
                  rightButton={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {route.strava && (
                        <a
                          href={route.strava}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#fc4c02', padding: '7px 14px', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Strava
                        </a>
                      )}
                      <a
                        href={`/gpx/${route.file}`}
                        download
                        style={{ fontSize: 12, fontWeight: 600, color: '#0a0a0a', background: accentColor, padding: '7px 14px', borderRadius: 6, textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        GPX
                      </a>
                    </div>
                  }
                />
              </div>
            </div>
          )}

          {/* Notes from DB (social runs / on-tour notes) */}
          {run.description && (
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', marginBottom: 10 }}>
                Notes
              </p>
              <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.75 }}>{run.description}</p>
            </div>
          )}

          {/* Footer CTAs */}
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #1a1a1a', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#888', background: '#111', border: '1px solid #1e1e1e', padding: '10px 18px', borderRadius: 8, textDecoration: 'none' }}
            >
              ← All upcoming runs
            </Link>
            {run.route_slug && (
              <Link
                href="/routes"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#888', background: '#111', border: '1px solid #1e1e1e', padding: '10px 18px', borderRadius: 8, textDecoration: 'none' }}
              >
                Browse all routes →
              </Link>
            )}
          </div>

        </section>
      </main>
      <Footer />
    </>
  )
}
