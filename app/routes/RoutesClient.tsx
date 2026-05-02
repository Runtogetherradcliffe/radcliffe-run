'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ROUTES, TERRAIN_LABELS, type Route, type Terrain, type Category } from '@/lib/routes'

/* ── Terrain colours ── */
const TERRAIN_STYLE: Record<Terrain, { bg: string; color: string; border: string }> = {
  trail: { bg: '#0d1a0d', color: '#7cb87c', border: '#1a3a1a' },
  road:  { bg: '#0d1221', color: '#6b9fd4', border: '#1a2a44' },
}

function TerrainBadge({ terrain }: { terrain: Terrain }) {
  const s = TERRAIN_STYLE[terrain]
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5 }}>
      {TERRAIN_LABELS[terrain]}
    </span>
  )
}

/* ── GPX parsing ── */
async function loadGPXCoords(file: string): Promise<[number, number][]> {
  const res = await fetch(`/gpx/${file}`)
  const text = await res.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const pts = Array.from(doc.querySelectorAll('trkpt, rtept, wpt'))
  return pts.map(p => [parseFloat(p.getAttribute('lat')!), parseFloat(p.getAttribute('lon')!)])
}

/* ── Bearing calculation ── */
function bearing(a: [number, number], b: [number, number]): number {
  const lat1 = a[0] * Math.PI / 180
  const lat2 = b[0] * Math.PI / 180
  const dLon = (b[1] - a[1]) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/* ── Haversine distance (metres) ── */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180
  const dφ = (b[0] - a[0]) * Math.PI / 180
  const dλ = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/* ── Arrow icon ── */
function arrowIcon(L: any, deg: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #f5a623;transform:rotate(${deg}deg);transform-origin:center center;filter:drop-shadow(0 0 2px rgba(0,0,0,0.8))"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

/* ── Filter pills ── */
type Filter = 'all' | Category

// Each filter carries its own colour scheme (inactive bg/text/border + active solid colour)
const FILTER_STYLE: Record<Filter, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  'all':             { bg: '#111',     text: '#888',    border: '#222',    activeBg: '#f5a623', activeText: '#0a0a0a' },
  'road-5k':         { bg: '#0d1221', text: '#6b9fd4', border: '#1a2a44', activeBg: '#6b9fd4', activeText: '#0a0a0a' },
  'road-8k':         { bg: '#0d1221', text: '#6b9fd4', border: '#1a2a44', activeBg: '#6b9fd4', activeText: '#0a0a0a' },
  'trail-5k':        { bg: '#0d1a0d', text: '#7cb87c', border: '#1a3a1a', activeBg: '#7cb87c', activeText: '#0a0a0a' },
  'trail-8k':        { bg: '#0d1a0d', text: '#7cb87c', border: '#1a3a1a', activeBg: '#7cb87c', activeText: '#0a0a0a' },
  'social-long-run': { bg: '#1a1208', text: '#d4a84b', border: '#3a2a0a', activeBg: '#d4a84b', activeText: '#0a0a0a' },
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',             label: 'All' },
  { key: 'road-5k',         label: 'Road 5k' },
  { key: 'road-8k',         label: 'Road 8k' },
  { key: 'trail-5k',        label: 'Trail 5k' },
  { key: 'trail-8k',        label: 'Trail 8k' },
  { key: 'social-long-run', label: 'Social Long Runs' },
]

/* ── GPX download (PWA-safe: fetch→blob, never navigates away) ── */
async function downloadGpx(file: string) {
  try {
    const res = await fetch(`/gpx/${file}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    // Fallback: open directly (non-PWA browsers handle this fine)
    window.open(`/gpx/${file}`, '_blank')
  }
}

export default function RoutesClient() {
  const [filter,   setFilter]   = useState<Filter>('all')
  const [selected, setSelected] = useState<Route | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const mapRef     = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)
  const mapObjRef  = useRef<any>(null)
  const polyRef    = useRef<any>(null)
  const arrowsRef  = useRef<any>(null)
  const markerRef  = useRef<any>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setIsMobile(mq.matches)
      // Let Leaflet recalculate after layout change
      setTimeout(() => mapObjRef.current?.invalidateSize(), 100)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const filtered = filter === 'all' ? ROUTES : ROUTES.filter(r => r.category === filter)

  /* ── Init Leaflet ── */
  useEffect(() => {
    if (typeof window === 'undefined' || mapObjRef.current) return
    let cancelled = false

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css' as any),
    ]).then(([L]) => {
      if (cancelled || mapObjRef.current) return

      // Defensive: clear any stale Leaflet state that survived a previous unmount
      if (mapRef.current && (mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id
      }

      leafletRef.current = L.default || L

      const map = leafletRef.current.map(mapRef.current!, {
        center: [53.5609, -2.3265],
        zoom: 13,
        zoomControl: true,
      })
      mapObjRef.current = map

      leafletRef.current.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
      ).addTo(map)

      const MEETING: [number, number] = [53.5609, -2.3265]
      const meetIcon = leafletRef.current.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#f5a623;border:2.5px solid #fff;box-shadow:0 0 0 4px rgba(245,166,35,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      })
      markerRef.current = leafletRef.current.marker(MEETING, { icon: meetIcon })
        .addTo(map)
        .bindPopup('<b style="font-family:Inter,sans-serif;font-size:13px"><a href="https://maps.app.goo.gl/d1FUYuqmNVpsWUs99" target="_blank" style="color:inherit;text-decoration:none">Radcliffe Market ↗</a></b><br><span style="font-size:12px;color:#888">Meeting point · 11 Blackburn Street</span>')

      setMapReady(true)
    })

    return () => {
      cancelled = true
      setMapReady(false)
      mapObjRef.current?.remove()
      mapObjRef.current = null
      if (mapRef.current) delete (mapRef.current as any)._leaflet_id
    }
  }, [])

  /* ── Draw route on map ── */
  const drawRoute = useCallback(async (route: Route) => {
    if (!mapObjRef.current || !leafletRef.current) return
    setLoading(true)
    try {
      const coords = await loadGPXCoords(route.file)
      if (!coords.length) return
      const L = leafletRef.current

      // Remove previous layers
      polyRef.current?.remove()
      arrowsRef.current?.remove()

      // Clean route line: dark underline + orange on top (no blurry shadow)
      const under = L.polyline(coords, { color: '#7a4800', weight: 5, opacity: 0.9 })
      const main  = L.polyline(coords, { color: '#f5a623', weight: 3, opacity: 1 })

      const group = L.layerGroup([under, main]).addTo(mapObjRef.current)
      polyRef.current = group

      // Direction arrows every ~800 m
      const arrowMarkers: any[] = []
      let distAcc = 0
      let nextArrow = 400 // first arrow at 400 m, then every 800 m
      for (let i = 1; i < coords.length; i++) {
        const d = haversine(coords[i - 1], coords[i])
        distAcc += d
        if (distAcc >= nextArrow) {
          const mid: [number, number] = [
            (coords[i - 1][0] + coords[i][0]) / 2,
            (coords[i - 1][1] + coords[i][1]) / 2,
          ]
          const deg = bearing(coords[i - 1], coords[i])
          arrowMarkers.push(L.marker(mid, { icon: arrowIcon(L, deg), interactive: false }))
          nextArrow = distAcc + 800
        }
      }
      arrowsRef.current = L.layerGroup(arrowMarkers).addTo(mapObjRef.current)

      // Fit map to route
      const bounds = L.latLngBounds(coords)
      mapObjRef.current.fitBounds(bounds, { padding: [48, 48] })
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Auto-select route from URL hash ── */
  useEffect(() => {
    if (!mapReady) return
    const hash = window.location.hash.slice(1) // strip '#'
    if (!hash) return
    const route = ROUTES.find(r => r.slug === hash)
    if (route) {
      setSelected(route)
      drawRoute(route)
    }
  }, [mapReady, drawRoute])

  const handleSelect = (route: Route) => {
    setSelected(route)
    drawRoute(route).then(() => {
      setTimeout(() => mapObjRef.current?.invalidateSize(), 50)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: isMobile ? '100%' : 380,
        height: isMobile ? 260 : 'auto',
        flexShrink: 0,
        background: '#0a0a0a',
        borderRight: isMobile ? 'none' : '1px solid #1e1e1e',
        borderBottom: isMobile ? '1px solid #1e1e1e' : 'none',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: isMobile ? '12px 16px 10px' : '24px 20px 16px' }}>
          {!isMobile && (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 6 }}>Route library</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16 }}>Explore the routes</h1>
            </>
          )}
          {isMobile && (
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 10 }}>Routes</p>
          )}

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => {
              const s = FILTER_STYLE[f.key]
              const active = filter === f.key
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  fontSize: isMobile ? 11 : 12, fontWeight: 500,
                  padding: isMobile ? '4px 10px' : '5px 14px', borderRadius: 20, cursor: 'pointer',
                  border: '1px solid', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  background:  active ? s.activeBg  : s.bg,
                  color:       active ? s.activeText : s.text,
                  borderColor: active ? s.activeBg  : s.border,
                }}>
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Count */}
          <p style={{ fontSize: 11, color: '#333', marginTop: 8 }}>{filtered.length} routes</p>
        </div>

        {/* Route list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 8px 8px' : '0 12px 20px' }}>
          {filtered.map(route => {
            const isSelected = selected?.slug === route.slug
            return (
              <button key={route.slug} onClick={() => handleSelect(route)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'block', padding: isMobile ? '8px 10px' : '12px 12px', borderRadius: 10, marginBottom: 3,
                border: '1px solid', transition: 'all 0.15s',
                background:   isSelected ? 'rgba(245,166,35,0.06)' : 'transparent',
                borderColor:  isSelected ? 'rgba(245,166,35,0.3)'  : 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: isSelected ? '#fff' : '#ccc', lineHeight: 1.3, flex: 1 }}>
                    {route.name}
                  </span>
                  {!isMobile && <TerrainBadge terrain={route.terrain} />}
                  {isMobile && (
                    <span style={{ fontSize: 11, color: isSelected ? '#f5a623' : '#555', flexShrink: 0 }}>
                      {route.distance_km}km
                    </span>
                  )}
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
                    <span style={{ fontSize: 12, color: isSelected ? '#f5a623' : '#555' }}>{route.distance_km} km</span>
                    <span style={{ fontSize: 12, color: '#333' }}>↑ {route.elevation_m}m</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── MAP ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Loading spinner */}
        {loading && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,10,10,0.9)', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#888', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
            Loading route...
          </div>
        )}

        {/* Empty state */}
        {!selected && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontSize: 14, color: '#555' }}>{isMobile ? 'Tap a route above' : 'Select a route from the list'}</p>
          </div>
        )}

        {/* Route info overlay — bottom on mobile (map is below sidebar), top-right on desktop */}
        {selected && (
          <div style={{
            position: 'absolute',
            ...(isMobile
              ? { bottom: 16, left: 16, right: 16 }
              : { top: 16, right: 16, maxWidth: 268 }),
            zIndex: 1000,
            background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)',
            border: '1px solid #2a2a2a', borderRadius: 12, padding: isMobile ? '12px 16px' : 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 6 : 10 }}>
              <div style={{ flex: 1 }}>
                {!isMobile && <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f5a623', marginBottom: 4 }}>Selected route</p>}
                <p style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, lineHeight: 1.3 }}>{selected.name}</p>
              </div>
              <button onClick={() => {
                setSelected(null)
                polyRef.current?.remove(); polyRef.current = null
                arrowsRef.current?.remove(); arrowsRef.current = null
              }}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>
                ×
              </button>
            </div>

            {isMobile ? (
              /* Compact mobile info: terrain + stats inline */
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TerrainBadge terrain={selected.terrain} />
                <span style={{ fontSize: 12, color: '#f5a623', fontWeight: 600 }}>{selected.distance_km} km</span>
                <span style={{ fontSize: 12, color: '#555' }}>↑ {selected.elevation_m}m</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {selected.strava && (
                    <a href={selected.strava} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '6px 10px', borderRadius: 6, textDecoration: 'none',
                      background: '#fc4c02', color: '#fff',
                    }}>
                      Strava
                    </a>
                  )}
                  <button onClick={() => downloadGpx(selected.file)} style={{
                    fontSize: 11, fontWeight: 600,
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
                    background: '#f5a623', color: '#0a0a0a',
                    border: 'none', fontFamily: 'inherit',
                  }}>
                    GPX
                  </button>
                </div>
              </div>
            ) : (
              /* Full desktop info */
              <>
                <TerrainBadge terrain={selected.terrain} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
                  {[
                    { label: 'Distance', value: `${selected.distance_km} km` },
                    { label: 'Elevation', value: `+${selected.elevation_m}m` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#111', borderRadius: 8, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: '#f5a623' }}>{value}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#555', marginBottom: 14 }}>📍 Starts at <a href="https://maps.app.goo.gl/d1FUYuqmNVpsWUs99" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Radcliffe Market</a></p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => downloadGpx(selected.file)} style={{
                    flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600,
                    padding: '9px 12px', borderRadius: 7, cursor: 'pointer',
                    background: '#f5a623', color: '#0a0a0a', transition: 'background 0.15s',
                    border: 'none', fontFamily: 'inherit',
                  }}>
                    Download GPX
                  </button>
                  {selected.strava && (
                    <a href={selected.strava} target="_blank" rel="noopener noreferrer" style={{
                      flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600,
                      padding: '9px 12px', borderRadius: 7, textDecoration: 'none',
                      background: '#fc4c02', color: '#fff', transition: 'opacity 0.15s',
                    }}>
                      View on Strava
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
