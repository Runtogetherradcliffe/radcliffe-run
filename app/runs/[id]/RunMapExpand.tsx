'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'

const MAP_HEIGHT = 300

async function loadGPXCoords(file: string): Promise<[number, number][]> {
  const res = await fetch(`/gpx/${file}`)
  const text = await res.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')
  const pts = Array.from(doc.querySelectorAll('trkpt, rtept, wpt'))
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
