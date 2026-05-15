'use client'
import { useState, useEffect, useRef, ReactNode } from 'react'

const MAP_HEIGHT = 300

/* -- Inject pulse keyframe once into the document */
function ensurePulseStyle() {
  if (typeof document === 'undefined') return
  if (document.getElementById('rtr-pulse-kf')) return
  const s = document.createElement('style')
  s.id = 'rtr-pulse-kf'
  s.textContent = '@keyframes rtr-pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.8);opacity:0} }'
  document.head.appendChild(s)
}

/* -- Fullscreen expand icon */
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

/* -- GPS locate icon */
function LocateIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="3"/>
      <path fillRule="evenodd" d="M8 0a.5.5 0 0 1 .5.5V2a6 6 0 0 1 5.5 5.5h1.5a.5.5 0 0 1 0 1H14A6 6 0 0 1 8.5 14v1.5a.5.5 0 0 1-1 0V14A6 6 0 0 1 2 8.5H.5a.5.5 0 0 1 0-1H2A6 6 0 0 1 7.5 2V.5A.5.5 0 0 1 8 0zm0 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="8" cy="8" r="2.5"/>
      <circle cx="8" cy="8" r="5"/>
      <line x1="8" y1="0.5" x2="8" y2="2.5"/>
      <line x1="8" y1="13.5" x2="8" y2="15.5"/>
      <line x1="0.5" y1="8" x2="2.5" y2="8"/>
      <line x1="13.5" y1="8" x2="15.5" y2="8"/>
    </svg>
  )
}

/* -- Bearing (degrees, 0 = north) */
function bearing(a: [number, number], b: [number, number]): number {
  const lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180
  const dLon = (b[1] - a[1]) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/* -- Haversine distance (metres) */
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const ph1 = a[0] * Math.PI / 180, ph2 = b[0] * Math.PI / 180
  const dph = (b[0] - a[0]) * Math.PI / 180, dl = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dph / 2) ** 2 + Math.cos(ph1) * Math.cos(ph2) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/* -- Arrow marker */
function arrowIcon(L: any, deg: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid ${color};transform:rotate(${deg}deg);transform-origin:center center;filter:drop-shadow(0 0 2px rgba(0,0,0,0.8))"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

/* -- Pulsing location dot marker */
function locationDotIcon(L: any) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;background:rgba(74,158,255,0.45);border-radius:50%;animation:rtr-pulse 1.6s ease-out infinite"></div>
      <div style="position:absolute;inset:4px;background:#4a9eff;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.6)"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
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
  const [open, setOpen]             = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [status, setStatus]         = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [locating, setLocating]     = useState(false)

  const mapRef           = useRef<HTMLDivElement>(null)
  const mapObjRef        = useRef<any>(null)
  const leafletRef       = useRef<any>(null)      // Leaflet instance after load
  const watchIdRef       = useRef<number | null>(null)
  const locationLayerRef = useRef<any>(null)      // pulsing dot + accuracy circle
  const breadcrumbRef    = useRef<any>(null)      // purple dashed trail polyline
  const trailCoordsRef   = useRef<[number, number][]>([])  // recorded positions
  const firstFixRef      = useRef(true)           // pan on first GPS fix always
  const fullscreenRef    = useRef(fullscreen)     // stable ref for watchPosition callback

  // Keep fullscreenRef in sync
  useEffect(() => { fullscreenRef.current = fullscreen }, [fullscreen])

  // Init (or invalidate) when toggled open
  useEffect(() => {
    if (!open) return
    if (mapObjRef.current) {
      setTimeout(() => mapObjRef.current?.invalidateSize(), 60)
      return
    }

    let cancelled = false
    setStatus('loading')

    const timer = setTimeout(async () => {
      if (cancelled || !mapRef.current) return
      try {
        ensurePulseStyle()
        const [L] = await Promise.all([
          import('leaflet'),
          import('leaflet/dist/leaflet.css' as any),
        ])
        if (cancelled || !mapRef.current || mapObjRef.current) return

        if ((mapRef.current as any)._leaflet_id) {
          delete (mapRef.current as any)._leaflet_id
        }

        const Lm = L.default || L
        leafletRef.current = Lm

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

  // Invalidate map size when fullscreen toggles
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

  // Destroy map + stop tracking on unmount
  useEffect(() => {
    return () => {
      stopLocate()
      mapObjRef.current?.remove()
      mapObjRef.current = null
      if (mapRef.current) delete (mapRef.current as any)._leaflet_id
    }
  }, [])

  /* -- Geolocation */
  function startLocate() {
    if (!navigator.geolocation || !leafletRef.current || !mapObjRef.current) return
    const Lm = leafletRef.current
    firstFixRef.current = true

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const latlng: [number, number] = [latitude, longitude]

        // Accumulate breadcrumb trail
        trailCoordsRef.current.push(latlng)

        // Update or create breadcrumb polyline
        if (breadcrumbRef.current) {
          breadcrumbRef.current.setLatLngs(trailCoordsRef.current)
        } else {
          breadcrumbRef.current = Lm.polyline(trailCoordsRef.current, {
            color: '#da82da',
            weight: 3,
            opacity: 0.85,
            dashArray: '6 8',
            lineCap: 'round',
          }).addTo(mapObjRef.current)
        }

        // Update location dot + accuracy circle
        if (locationLayerRef.current) locationLayerRef.current.remove()
        const dot = Lm.marker(latlng, {
          icon: locationDotIcon(Lm),
          interactive: false,
          zIndexOffset: 1000,
        })
        const circle = Lm.circle(latlng, {
          radius: accuracy,
          color: '#4a9eff',
          fillColor: '#4a9eff',
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.25,
        })
        locationLayerRef.current = Lm.layerGroup([circle, dot]).addTo(mapObjRef.current)

        // Pan on first fix always; subsequent fixes follow only in fullscreen
        if (firstFixRef.current || fullscreenRef.current) {
          mapObjRef.current?.panTo(latlng)
          firstFixRef.current = false
        }
      },
      () => {
        // Permission denied or unavailable - stop silently
        stopLocate()
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
    setLocating(true)
  }

  function stopLocate() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (locationLayerRef.current) {
      locationLayerRef.current.remove()
      locationLayerRef.current = null
    }
    if (breadcrumbRef.current) {
      breadcrumbRef.current.remove()
      breadcrumbRef.current = null
    }
    trailCoordsRef.current = []
    setLocating(false)
  }

  function toggleLocate() {
    if (locating) stopLocate()
    else startLocate()
  }

  return (
    <div>
      {/* Toggle + optional right-slot on one row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 'var(--text-sm)', fontWeight: 600, color: accentColor,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {open ? 'Hide map ↑' : 'Show route map ↓'}
        </button>
        {rightButton}
      </div>

      {/* Map wrapper */}
      <div style={fullscreen ? {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--bg)',
      } : {
        height: open ? MAP_HEIGHT : 0,
        overflow: 'hidden',
        borderRadius: 10,
        marginTop: open ? 12 : 0,
        transition: 'height 0.25s ease, margin-top 0.25s ease',
        position: 'relative',
      }}>
        {/* Single map div - ref never changes so Leaflet stays attached */}
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: fullscreen ? '100dvh' : MAP_HEIGHT,
            borderRadius: fullscreen ? 0 : 10,
          }}
        />

        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', borderRadius: fullscreen ? 0 : 10 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--faint)' }}>Loading map...</p>
          </div>
        )}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card)', borderRadius: fullscreen ? 0 : 10 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--faint)' }}>Map unavailable</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            {/* Locate me button - bottom left */}
            <button
              onClick={toggleLocate}
              aria-label={locating ? 'Stop tracking location' : 'Show my location'}
              style={{
                position: 'absolute',
                bottom: fullscreen ? 24 : 10,
                left: fullscreen ? 16 : 10,
                zIndex: 1000,
                background: locating ? 'rgba(74,158,255,0.18)' : 'rgba(17,17,17,0.88)',
                border: locating ? '1px solid #4a9eff' : '1px solid #333',
                borderRadius: 8,
                padding: fullscreen ? '10px 14px' : '7px 8px',
                cursor: 'pointer',
                color: locating ? '#4a9eff' : '#aaa',
                display: 'flex', alignItems: 'center', gap: fullscreen ? 8 : 0,
                fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              }}
            >
              <LocateIcon active={locating} />
              {fullscreen && (locating ? ' Tracking location' : ' Show my location')}
            </button>

            {/* Expand / collapse button - bottom right */}
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
                fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'Inter, sans-serif',
              }}
            >
              <ExpandIcon fullscreen={fullscreen} />
              {fullscreen && ' Exit fullscreen'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
