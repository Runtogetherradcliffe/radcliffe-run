'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'

const MAP_HEIGHT = 300

/* ── Fullscreen expand icon ── */
function ExpandIcon({ fullscreen }: { fullscreen: boolean }) {
  return fullscreen ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.5 1H2a1 1 0 0 0-1 1v3.5h1.5V3h2V1.5L5.5 1zM11 1.5V3h2v2.5H14.5V2a1 1 0 0 0-1-1H11zM1 11v2.5a1 1 0 0 0 1 1h3.5V13H3v-2H1zM13 13h-2v1.5H14.5V11H13v2z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.5 1H5V2.5H3v2H1.5V1zM11 1h3.5v3.5H13V2.5h-2V1zM1.5 11H3v2h2v1.5H1.5V11zM13 13H11v1.5h3.5V11H13v2z"/>
    </svg>
  )
}

/* ── Bearing (degrees, 0 = north) ── */
function bearing(a: [number, number], b: [number, number]): number {
  const lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180
  const dLon = (b[1] - a[1]) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/* ── Haversine distance (metres) ── */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180
  const dφ = (b[0] - a[0]) * Math.PI / 180, dλ = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/* ── Arrow marker ── */
function arrowIcon(L: any, deg: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid ${color};transform:rotate(${deg}deg);transform-origin:center center;filter:drop-shadow(0 0 2px rgba(0,0,0,0.8))"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

async function loadGPXCoords(file: string): Promise<[number, number][]> {
  const res = await fetch(`/gpx/${file}`)
  const text = await res.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  const rtepts = Array.from(doc.querySelectorAll('rtept'))
  const pts = trkpts.length > 0 ? trkpts : rtepts.length > 0 ? rtepts : Array.from(doc.querySelectorAll('wpt'))
  return pts.map(p => [parseFloat(p.getAttribute('lat')!), parseFloat(p.getAttribute('lon')!)])
}

export default function RunMapExpand({ file, accentColor = '#f5a623', rightButton }: { file: string; accentColor?: string; rightButton?: ReactNode }) {
  const [open, setOpen]           = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [status, setStatus]       = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const mapRef    = useRef<HTMLDivElement>(null)
  const mapObjRef = useRef<any>(null)

  // Init (or invalidate) when toggled open
  useEffect(() => {
    if (!open) return
    if (mapObjRef.current) {
      // Already initialised — fix size after reveal animation
      setTimeout(() => mapObjRef.current?.invalidateSize(), 60)
      return
    }

    let cancelled = false
    setStatus('loading')

    // Small delay so the container has rendered at full height before Leaflet measures it
    const timer = setTimeout(async () => {
      if (cancelled || !mapRef.current) return
      try {
        const [L] = await Promise.all([
          import('leaflet'),
          import('leaflet/dist/leaflet.css' as any),
        ])
        if (cancelled || !mapRef.current || mapObjRef.current) return

        // Clear any stale Leaflet state (e.g. from a previous page visit)
        if ((mapRef.current as any)._leaflet_id) {
          delete (mapRef.current as any)._leaflet_id
        }

        const Lm = L.default || L
        const map = Lm.map(mapRef.current, { center: [53.5609, -2.3265] as [number, number], zoom: 13 })
        mapObjRef.current = map

        Lm.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap © CARTO', maxZoom: 19,
        }).addTo(map)

        const coords = await loadGPXCoords(file)
        if (cancelled) return

        if (coords.length) {
          Lm.polyline(coords, { color: '#7a4800', weight: 5, opacity: 0.9 }).addTo(map)
          Lm.polyline(coords, { color: accentColor, weight: 3, opacity: 1 }).addTo(map)

          // Direction arrows every ~800 m
          const arrowMarkers: any[] = []
          let distAcc = 0, nextArrow = 400
          for (let i = 1; i < coords.length; i++) {
            distAcc += haversine(coords[i - 1], coords[i])
            if (distAcc >= nextArrow) {
              const mid: [number, number] = [
                (coords[i - 1][0] + coords[i][0]) / 2,
                (coords[i - 1][1] + coords[i][1]) / 2,
              ]
              arrowMarkers.push(Lm.marker(mid, { icon: arrowIcon(Lm, bearing(coords[i - 1], coords[i]), accentColor), interactive: false }))
              nextArrow = distAcc + 800
            }
          }
          Lm.layerGroup(arrowMarkers).addTo(map)

          map.fitBounds(Lm.latLngBounds(coords), { padding: [24, 24] })
        }
        map.invalidateSize()
        if (!cancelled) setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }, 80)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [open, file, accentColor])

  // Invalidate map size when fullscreen toggles (after CSS transition)
  useEffect(() => {
    const t = setTimeout(() => mapObjRef.current?.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [fullscreen])

  // Close fullscreen on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Destroy map on component unmount
  useEffect(() => {
    return () => {
      mapObjRef.current?.remove()
      mapObjRef.current = null
      if (mapRef.current) delete (mapRef.current as any)._leaflet_id
    }
  }, [])

  return (
    <div>
      {/* Toggle + optional right-slot (e.g. Download GPX) on one row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: accentColor,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {open ? 'Hide map ↑' : 'Show route map ↓'}
        </button>
        {rightButton}
      </div>

      {/* Map wrapper — inline when open, fixed fullscreen overlay when expanded */}
      <div style={fullscreen ? {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0a0a0a',
      } : {
        height: open ? MAP_HEIGHT : 0,
        overflow: 'hidden',
        borderRadius: 10,
        marginTop: open ? 12 : 0,
        transition: 'height 0.25s ease, margin-top 0.25s ease',
        position: 'relative',
      }}>
        {/* Single map div — ref never changes so Leaflet stays attached */}
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: fullscreen ? '100dvh' : MAP_HEIGHT,
            borderRadius: fullscreen ? 0 : 10,
          }}
        />

        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: fullscreen ? 0 : 10 }}>
            <p style={{ fontSize: 13, color: '#555' }}>Loading map…</p>
          </div>
        )}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: fullscreen ? 0 : 10 }}>
            <p style={{ fontSize: 13, color: '#555' }}>Map unavailable</p>
          </div>
        )}

        {/* Expand / collapse button — shown when map is visible */}
        {status === 'ready' && (
          <button
            onClick={() => setFullscreen(f => !f)}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Expand map'}
            style={{
              position: 'absolute',
              bottom: fullscreen ? 24 : 10,
              right: fullscreen ? 16 : 10,
              zIndex: 1000,
              background: 'rgba(17,17,17,0.88)',
              border: '1px solid #333',
              borderRadius: 8,
              padding: fullscreen ? '10px 14px' : '7px 8px',
              cursor: 'pointer',
              color: fullscreen ? '#fff' : '#aaa',
              display: 'flex', alignItems: 'center', gap: fullscreen ? 8 : 0,
              fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            }}
          >
            <ExpandIcon fullscreen={fullscreen} />
            {fullscreen && ' Exit fullscreen'}
          </button>
        )}
      </div>
    </div>
  )
}
