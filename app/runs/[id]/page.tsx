'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ROUTES } from '@/lib/routes'
import { supabase } from '@/lib/supabase'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function cleanTitle(title: string) {
  return title.replace(/^RTR\s+[58]k\s*/i, '').trim()
}

function groupLabel(slug: string | null): string | null {
  if (!slug) return null
  if (slug.startsWith('trail-5k--') || slug.startsWith('road-5k--')) return '5K GROUP'
  if (slug.startsWith('trail-8k--') || slug.startsWith('road-8k--')) return '8K GROUP'
  return null
}

const TERRAIN_BADGE: Record<string, React.CSSProperties> = {
  trail: { background: '#0d2a0d', color: '#4caf76', border: '1px solid #1a3d1a' },
  road:  { background: '#0d1a2a', color: '#5b9bd5', border: '1px solid #1a2d42' },
  mixed: { background: '#1a1a0d', color: '#c9a84c', border: '1px solid #2a2a1a' },
}

// Dynamically import the Leaflet map to avoid SSR issues
const RunMap = dynamic(() => import('@/components/RunMap'), { ssr: false, loading: () => (
  <div style={{ height: 360, background: '#0d1a0d', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ color: '#555', fontSize: 13 }}>Loading map…</span>
  </div>
)})

type Run = {
  id: string
  date: string
  title: string
  distance_km: number | null
  terrain: 'trail' | 'road' | 'mixed' | null
  meeting_point: string
  meeting_map_url: string | null
  route_slug: string | null
  on_tour: boolean
  has_jeffing: boolean
  run_type: string
  description: string | null
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [run,     setRun]     = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('runs')
        .select('id, date, title, distance_km, terrain, meeting_point, meeting_map_url, route_slug, on_tour, has_jeffing, run_type, description')
        .eq('id', id)
        .single()
      if (error || !data) { setError('Run not found'); setLoading(false); return }
      setRun(data as Run)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#555', fontSize: 14 }}>Loading…</span>
    </div>
  )

  if (error || !run) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ color: '#888', fontSize: 15 }}>Run not found</p>
      <Link href="/" style={{ color: '#f5a623', fontSize: 14 }}>← Back to schedule</Link>
    </div>
  )

  const route       = run.route_slug ? ROUTES.find(r => r.slug === run.route_slug) : null
  const group       = groupLabel(run.route_slug)
  const hasMap      = !!run.route_slug && !!route
  const description = route?.description ?? run.description ?? null

  const GROUP_STYLE: Record<string, React.CSSProperties> = {
    '5K GROUP': { background: 'rgba(76,175,118,0.12)', border: '1px solid rgba(76,175,118,0.35)', color: '#4caf76' },
    '8K GROUP': { background: 'rgba(91,155,213,0.12)', border: '1px solid rgba(91,155,213,0.35)', color: '#5b9bd5' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* Top nav bar */}
      <div style={{ borderBottom: '1px solid #1e1e1e', padding: 'var(--run-nav-pad)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ color: '#f5a623', fontSize: 13, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.04em' }}>
            RTR
          </Link>
          <Link href="/" style={{ color: '#555', fontSize: 13, textDecoration: 'none' }}>
            ← Back to schedule
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--run-content-pad)' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>
            {fmtDate(run.date)} &middot; 7pm
          </p>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.15 }}>
            {cleanTitle(run.title)}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {group && (
              <span style={{ ...(GROUP_STYLE[group] ?? {}), fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 5 }}>
                {group === '5K GROUP' ? `5K · ${run.has_jeffing ? 'Run or Jeff' : 'Run'}` : '8K · Run'}
              </span>
            )}
            {run.terrain && (
              <span style={{ ...(TERRAIN_BADGE[run.terrain] ?? {}), fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 5 }}>
                {run.terrain}
              </span>
            )}
            {run.on_tour && (
              <span style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 5 }}>
                ON TOUR
              </span>
            )}
            {run.has_jeffing && (
              <span style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: 5 }}>
                JEFFING TONIGHT
              </span>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'var(--run-stats-cols)', gap: 1, marginBottom: 32, borderRadius: 10, overflow: 'hidden', border: '1px solid #1e1e1e' }}>
          {[
            { label: 'Distance',  value: route ? `${route.distance_km} km` : run.distance_km ? `${run.distance_km} km` : '—' },
            { label: 'Elevation', value: route ? `↑ ${route.elevation_m} m` : '—' },
            { label: 'Meeting',   value: run.on_tour ? run.meeting_point : 'Radcliffe Market' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#111', padding: '20px 24px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Interactive map */}
        {hasMap && route && (
          <div style={{ marginBottom: 32 }}>
            <RunMap gpxFile={route.file} center={route.center} onTour={run.on_tour} meetingLabel={run.meeting_point} />
          </div>
        )}

        {/* Description */}
        {description && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 12 }}>About this route</p>
            <p style={{ fontSize: 16, fontWeight: 300, color: '#ccc', lineHeight: 1.85 }}>{description}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 24, borderTop: '1px solid #1e1e1e' }}>
          {route && (
            <a href={`/gpx/${route.file}`} download
               style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #1e1e1e', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
              ↓ Download GPX
            </a>
          )}
          {run.meeting_map_url && (
            <a href={run.meeting_map_url} target="_blank" rel="noopener noreferrer"
               style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#111', border: '1px solid #1e1e1e', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
              📍 View meeting point
            </a>
          )}
          <Link href="/routes"
               style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(245,166,35,0.3)', color: '#f5a623', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
            All routes →
          </Link>
        </div>
      </div>
    </div>
  )
}
