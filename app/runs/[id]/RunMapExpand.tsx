'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'

const MAP_HEIGHT = 300

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
  const [open, setOpen]     = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
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

      {/* Outer wrapper clips to 0 when closed; inner div always full height so Leaflet gets real dimensions */}
      <div style={{
        height: open ? MAP_HEIGHT : 0,
        overflow: 'hidden',
        borderRadius: 10,
        marginTop: open ? 12 : 0,
        transition: 'height 0.25s ease, margin-top 0.25s ease',
        position: 'relative',
      }}>
        <div ref={mapRef} style={{ width: '100%', height: MAP_HEIGHT, borderRadius: 10 }} />
        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#555' }}>Loading map…</p>
          </div>
        )}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#555' }}>Map unavailable</p>
          </div>
        )}
      </div>
    </div>
  )
}
