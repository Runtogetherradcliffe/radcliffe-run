'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { loadLeaflet, type Leaflet, type LeafletContainer } from '@/lib/leaflet'
import { WALKS, DIFFICULTY_LABELS, walkingTimeMin, formatWalkingTime, type Walk, type Difficulty, type Stage } from '@/lib/walks'
import { resolveLayer, HAS_MAPTILER } from '@/lib/mapLayers'
import MapLayersControl from '@/components/MapLayersControl'
import GpxButton from '@/app/runs/[id]/GpxButton'

/* ── Difficulty colours ── */
const DIFF_STYLE: Record<Difficulty, { bg: string; color: string; border: string }> = {
  easy:        { bg: '#0d1a0d', color: '#7cb87c', border: '#1a3a1a' },
  moderate:    { bg: '#1a1208', color: '#d4a84b', border: '#3a2a0a' },
  challenging: { bg: '#1a0d0d', color: '#d48a8a', border: '#3a1a1a' },
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const s = DIFF_STYLE[difficulty]
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5 }}>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  )
}

/* ── GPX parsing ── */
async function loadGPXCoords(file: string): Promise<[number, number][]> {
  const res = await fetch(`/gpx/${file}`)
  const text = await res.text()
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  const trkpts = Array.from(doc.querySelectorAll('trkpt'))
  const rtepts = Array.from(doc.querySelectorAll('rtept'))
  const pts = trkpts.length > 0 ? trkpts : rtepts.length > 0 ? rtepts : Array.from(doc.querySelectorAll('wpt'))
  return pts.map(p => [parseFloat(p.getAttribute('lat')!), parseFloat(p.getAttribute('lon')!)])
}

/* ── Geometry helpers ── */
function bearing(a: [number, number], b: [number, number]): number {
  const lat1 = a[0] * Math.PI / 180, lat2 = b[0] * Math.PI / 180
  const dLon = (b[1] - a[1]) * Math.PI / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const p1 = a[0] * Math.PI / 180, p2 = b[0] * Math.PI / 180
  const dp = (b[0] - a[0]) * Math.PI / 180, dl = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
function arrowIcon(L: typeof Leaflet, deg: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #f5a623;transform:rotate(${deg}deg);transform-origin:center center;filter:drop-shadow(0 0 2px rgba(0,0,0,0.8))"></div>`,
    iconSize: [10, 10], iconAnchor: [5, 5],
  })
}

/* ── Numbered heritage-stop marker ── */
function stageIcon(L: typeof Leaflet, n: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#f5a623;border:2px solid #fff;box-shadow:0 0 0 3px rgba(245,166,35,0.3);display:flex;align-items:center;justify-content:center;font:700 12px Inter,sans-serif;color:#0a0a0a">${n}</div>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  })
}

/* ── Point at a fraction (0..1) of the route length ── */
function pointAtFraction(coords: [number, number][], frac: number): [number, number] {
  if (frac <= 0) return coords[0]
  if (frac >= 1) return coords[coords.length - 1]
  let total = 0
  for (let i = 1; i < coords.length; i++) total += haversine(coords[i - 1], coords[i])
  const target = total * frac
  let acc = 0
  for (let i = 1; i < coords.length; i++) {
    const d = haversine(coords[i - 1], coords[i])
    if (acc + d >= target) {
      const t = d === 0 ? 0 : (target - acc) / d
      return [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t]
    }
    acc += d
  }
  return coords[coords.length - 1]
}

function stageLatLng(coords: [number, number][], s: Stage): [number, number] {
  if (s.at) return s.at
  return pointAtFraction(coords, s.fraction ?? 0)
}

/* ── Pulsing location dot (geolocation) ── */
function ensurePulseStyle() {
  if (typeof document === 'undefined' || document.getElementById('rtr-pulse-kf')) return
  const s = document.createElement('style')
  s.id = 'rtr-pulse-kf'
  s.textContent = '@keyframes rtr-pulse { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.8);opacity:0} }'
  document.head.appendChild(s)
}
function locationDotIcon(L: typeof Leaflet) {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:20px;height:20px">
      <div style="position:absolute;inset:0;background:rgba(74,158,255,0.45);border-radius:50%;animation:rtr-pulse 1.6s ease-out infinite"></div>
      <div style="position:absolute;inset:4px;background:#4a9eff;border-radius:50%;border:2px solid #fff;box-shadow:0 0 6px rgba(0,0,0,0.6)"></div>
    </div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  })
}

/* ── Control icons ── */
function LocateIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="8" r="3"/>
      <path fillRule="evenodd" d="M8 0a.5.5 0 0 1 .5.5V2a6 6 0 0 1 5.5 5.5h1.5a.5.5 0 0 1 0 1H14A6 6 0 0 1 8.5 14v1.5a.5.5 0 0 1-1 0V14A6 6 0 0 1 2 8.5H.5a.5.5 0 0 1 0-1H2A6 6 0 0 1 7.5 2V.5A.5.5 0 0 1 8 0zm0 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="8" cy="8" r="2.5"/><circle cx="8" cy="8" r="5"/>
      <line x1="8" y1="0.5" x2="8" y2="2.5"/><line x1="8" y1="13.5" x2="8" y2="15.5"/>
      <line x1="0.5" y1="8" x2="2.5" y2="8"/><line x1="13.5" y1="8" x2="15.5" y2="8"/>
    </svg>
  )
}
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

/* ── Difficulty filter ── */
type Filter = 'all' | Difficulty
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'easy',        label: 'Easy' },
  { key: 'moderate',    label: 'Moderate' },
  { key: 'challenging', label: 'Challenging' },
]

export default function WalksClient() {
  const [filter, setFilter]   = useState<Filter>('all')
  const [selected, setSelected] = useState<Walk | null>(null)
  const [cardOpen, setCardOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeLayerId, setActiveLayerId] = useState<string>('auto')
  const [fullscreen, setFullscreen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [coordsMode, setCoordsMode] = useState(false)   // dev-only: ?coords in URL
  const [clickedCoord, setClickedCoord] = useState<string | null>(null)
  const mapRef       = useRef<HTMLDivElement>(null)
  const leafletRef   = useRef<typeof Leaflet | null>(null)
  const mapObjRef    = useRef<Leaflet.Map | null>(null)
  const polyRef      = useRef<Leaflet.LayerGroup | null>(null)
  const arrowsRef    = useRef<Leaflet.LayerGroup | null>(null)
  const stagesRef    = useRef<Leaflet.LayerGroup | null>(null)
  const stageMarkersRef = useRef<Leaflet.Marker[]>([])
  const tileLayerRef = useRef<Leaflet.TileLayer | null>(null)
  const watchIdRef       = useRef<number | null>(null)
  const locationLayerRef = useRef<Leaflet.LayerGroup | null>(null)
  const breadcrumbRef    = useRef<Leaflet.Polyline | null>(null)
  const trailCoordsRef   = useRef<[number, number][]>([])
  const firstFixRef      = useRef(true)
  const fullscreenRef    = useRef(fullscreen)
  useEffect(() => { fullscreenRef.current = fullscreen }, [fullscreen])
  const coordsModeRef    = useRef(false)
  useEffect(() => {
    const on = new URLSearchParams(window.location.search).has('coords')
    coordsModeRef.current = on
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the ?coords dev flag after mount
    setCoordsMode(on)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => {
      setIsMobile(mq.matches)
      setTimeout(() => mapObjRef.current?.invalidateSize(), 100)
    }
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Walks are mostly trails, so default the auto base layer to outdoors.
  const filtered = filter === 'all' ? WALKS : WALKS.filter(w => w.difficulty === filter)
  const availableFilters = FILTERS.filter(f => f.key === 'all' || WALKS.some(w => w.difficulty === f.key))

  /* ── Init Leaflet ── */
  useEffect(() => {
    if (typeof window === 'undefined' || mapObjRef.current) return
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || mapObjRef.current) return
      ensurePulseStyle()
      if (mapRef.current && (mapRef.current as LeafletContainer)._leaflet_id) {
        delete (mapRef.current as LeafletContainer)._leaflet_id
      }
      leafletRef.current = L
      const map = L.map(mapRef.current!, { center: [53.5609, -2.3265], zoom: 13, zoomControl: true })
      mapObjRef.current = map
      map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        // Dev-only: ?coords mode copies the tapped lat-long instead of collapsing.
        if (coordsModeRef.current) {
          const c = `[${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}]`
          setClickedCoord(c)
          navigator.clipboard?.writeText(c).catch(() => {})
          return
        }
        // Tapping the map folds the details card away (route stays) on desktop and mobile.
        setCardOpen(false)
      })
      setMapReady(true)
    })
    return () => {
      cancelled = true
      setMapReady(false)
      mapObjRef.current?.remove()
      mapObjRef.current = null
      if (mapRef.current) delete (mapRef.current as LeafletContainer)._leaflet_id
    }
  }, [])

  /* ── Apply the active base map layer (default trail -> outdoors) ── */
  useEffect(() => {
    if (!mapReady || !mapObjRef.current || !leafletRef.current) return
    const def = resolveLayer(activeLayerId, 'trail')
    tileLayerRef.current?.remove()
    tileLayerRef.current = leafletRef.current
      .tileLayer(def.url, { attribution: def.attr, maxZoom: def.maxZoom })
      .addTo(mapObjRef.current)
  }, [activeLayerId, mapReady])

  /* ── Draw walk on map ── */
  const drawWalk = useCallback(async (walk: Walk) => {
    if (!mapObjRef.current || !leafletRef.current) return
    setLoading(true)
    try {
      const coords = await loadGPXCoords(walk.file)
      if (!coords.length) return
      const L = leafletRef.current
      polyRef.current?.remove()
      arrowsRef.current?.remove()
      stagesRef.current?.remove()
      stageMarkersRef.current = []

      const under = L.polyline(coords, { color: '#7a4800', weight: 5, opacity: 0.9 })
      const main  = L.polyline(coords, { color: '#f5a623', weight: 3, opacity: 1 })
      polyRef.current = L.layerGroup([under, main]).addTo(mapObjRef.current)

      // Heritage stops (numbered markers with a popup)
      if (walk.stages?.length) {
        const markers = walk.stages.map((s, i) => {
          const ll = stageLatLng(coords, s)
          return L.marker(ll, { icon: stageIcon(L, i + 1), zIndexOffset: 500 })
            .bindPopup(`<b style="font-family:Inter,sans-serif;font-size:13px;color:var(--white)">${i + 1}. ${s.title}</b><br><span style="font-family:Inter,sans-serif;font-size:12px;color:var(--dim);line-height:1.4;display:block;margin-top:4px">${s.blurb}</span>`, { maxWidth: 240 })
        })
        stageMarkersRef.current = markers
        stagesRef.current = L.layerGroup(markers).addTo(mapObjRef.current)
      }

      const arrowMarkers: Leaflet.Marker[] = []
      let distAcc = 0, nextArrow = 400
      for (let i = 1; i < coords.length; i++) {
        distAcc += haversine(coords[i - 1], coords[i])
        if (distAcc >= nextArrow) {
          const mid: [number, number] = [(coords[i - 1][0] + coords[i][0]) / 2, (coords[i - 1][1] + coords[i][1]) / 2]
          arrowMarkers.push(L.marker(mid, { icon: arrowIcon(L, bearing(coords[i - 1], coords[i])), interactive: false }))
          nextArrow = distAcc + 800
        }
      }
      arrowsRef.current = L.layerGroup(arrowMarkers).addTo(mapObjRef.current)
      mapObjRef.current.fitBounds(L.latLngBounds(coords), { padding: [48, 48] })
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Auto-select walk from URL hash ── */
  useEffect(() => {
    if (!mapReady) return
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const walk = WALKS.find(w => w.slug === hash)
    if (walk) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync of selection from the URL hash once the map is ready
      setSelected(walk)
      drawWalk(walk)
    }
  }, [mapReady, drawWalk])

  const handleSelect = (walk: Walk) => {
    setSelected(walk)
    setCardOpen(true)
    drawWalk(walk).then(() => setTimeout(() => mapObjRef.current?.invalidateSize(), 50))
  }

  const clearSelection = () => {
    setSelected(null)
    polyRef.current?.remove(); polyRef.current = null
    arrowsRef.current?.remove(); arrowsRef.current = null
    stagesRef.current?.remove(); stagesRef.current = null
    stageMarkersRef.current = []
  }

  /* ── Fullscreen: recalc map size on toggle, exit on Escape ── */
  useEffect(() => {
    const t = setTimeout(() => mapObjRef.current?.invalidateSize(), 80)
    return () => clearTimeout(t)
  }, [fullscreen])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── Geolocation (locate me) ── */
  const stopLocate = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
    locationLayerRef.current?.remove(); locationLayerRef.current = null
    breadcrumbRef.current?.remove();    breadcrumbRef.current = null
    trailCoordsRef.current = []
    setLocating(false)
  }, [])

  const startLocate = useCallback(() => {
    const L = leafletRef.current, map = mapObjRef.current
    if (!navigator.geolocation || !L || !map) return
    firstFixRef.current = true
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const latlng: [number, number] = [latitude, longitude]
        trailCoordsRef.current.push(latlng)
        if (breadcrumbRef.current) breadcrumbRef.current.setLatLngs(trailCoordsRef.current)
        else breadcrumbRef.current = L.polyline(trailCoordsRef.current, { color: '#da82da', weight: 3, opacity: 0.85, dashArray: '6 8', lineCap: 'round' }).addTo(map)
        locationLayerRef.current?.remove()
        const dot = L.marker(latlng, { icon: locationDotIcon(L), interactive: false, zIndexOffset: 1000 })
        const circle = L.circle(latlng, { radius: accuracy, color: '#4a9eff', fillColor: '#4a9eff', fillOpacity: 0.08, weight: 1, opacity: 0.25 })
        locationLayerRef.current = L.layerGroup([circle, dot]).addTo(map)
        if (firstFixRef.current || fullscreenRef.current) { map.panTo(latlng); firstFixRef.current = false }
      },
      () => stopLocate(),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
    setLocating(true)
  }, [stopLocate])

  const toggleLocate = () => { if (locating) stopLocate(); else startLocate() }

  // Stop tracking on unmount
  useEffect(() => () => stopLocate(), [stopLocate])

  const time = (w: Walk) => formatWalkingTime(w.timeOverrideMin ?? walkingTimeMin(w.distance_km, w.elevation_m))

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: isMobile ? '100%' : 380, height: isMobile ? '44vh' : 'auto', flexShrink: 0,
        background: 'var(--bg)', borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: isMobile ? '12px 16px 10px' : '24px 20px 16px' }}>
          {!isMobile && (
            <>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 6 }}>Community walks</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>Explore Radcliffe on foot</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Free, self-guided walking routes around Radcliffe and the Irwell Valley. Tap the map and try the historic 1888 view to see how the area once looked.
              </p>
            </>
          )}
          {isMobile && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 6 }}>Walks</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 10, lineHeight: 1.45 }}>
                Free, self-guided walks around Radcliffe and the Irwell Valley. Tap a walk, then try the historic 1888 view to see how the area once looked.
              </p>
            </>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {availableFilters.map(f => {
              const active = filter === f.key
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  fontSize: isMobile ? 11 : 12, fontWeight: 500, padding: isMobile ? '4px 10px' : '5px 14px',
                  borderRadius: 20, cursor: 'pointer', border: '1px solid', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  background: active ? 'var(--orange)' : 'var(--card)',
                  color: active ? 'var(--bg)' : 'var(--muted)',
                  borderColor: active ? 'var(--orange)' : 'var(--border-2)',
                }}>
                  {f.label}
                </button>
              )
            })}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 8 }}>{filtered.length} walks</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 8px 8px' : '0 12px 20px' }}>
          {filtered.map(walk => {
            const isSelected = selected?.slug === walk.slug
            return (
              <button key={walk.slug} onClick={() => handleSelect(walk)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'block', padding: isMobile ? '8px 10px' : '12px', borderRadius: 10, marginBottom: 3,
                border: '1px solid', transition: 'all 0.15s',
                background: isSelected ? 'rgba(245,166,35,0.06)' : 'transparent',
                borderColor: isSelected ? 'rgba(245,166,35,0.3)' : 'transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: isSelected ? 'var(--white)' : 'var(--dim)', lineHeight: 1.3, flex: 1 }}>
                    {walk.name}
                  </span>
                  {!isMobile && <DifficultyBadge difficulty={walk.difficulty} />}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {isMobile && <DifficultyBadge difficulty={walk.difficulty} />}
                  <span style={{ fontSize: 12, color: isSelected ? 'var(--orange)' : 'var(--muted)' }}>{walk.distance_km} km</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>~{time(walk)}</span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── MAP ── */}
      <div style={fullscreen
        ? { position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg)' }
        : { flex: 1, position: 'relative', minHeight: 0 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {mapReady && (
          <MapLayersControl activeLayerId={activeLayerId} terrain="trail" onChange={setActiveLayerId} />
        )}

        {/* Locate me + fullscreen controls. Desktop: bottom corners (info card is
            top-right). Mobile: top-right stack (info card spans the bottom). */}
        {mapReady && (
          <>
            <button
              onClick={toggleLocate}
              aria-label={locating ? 'Stop tracking location' : 'Show my location'}
              style={{
                position: 'absolute', zIndex: 1000,
                ...(isMobile ? { top: 10, right: 10 } : { bottom: 10, left: 10 }),
                background: locating ? 'rgba(74,158,255,0.18)' : 'var(--overlay)',
                border: locating ? '1px solid #4a9eff' : '1px solid var(--border-2)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                color: locating ? '#4a9eff' : 'var(--white)', display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'Inter, sans-serif', fontSize: 'var(--text-sm)', fontWeight: 600,
                backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
              <LocateIcon active={locating} />
              {locating ? 'Tracking' : 'Locate me'}
            </button>
            <button
              onClick={() => setFullscreen(f => !f)}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Expand map'}
              style={{
                position: 'absolute', zIndex: 1000,
                ...(isMobile ? { top: 56, right: 10 } : { bottom: 10, right: 10 }),
                background: 'var(--overlay)', border: '1px solid var(--border-2)',
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                color: 'var(--white)', display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'Inter, sans-serif', fontSize: 'var(--text-sm)', fontWeight: 600,
                backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
              <ExpandIcon fullscreen={fullscreen} />
              {fullscreen ? 'Exit' : 'Full screen'}
            </button>
          </>
        )}

        {loading && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--overlay)', border: '1px solid var(--border-2)', borderRadius: 8, padding: '8px 16px', fontSize: 'var(--text-sm)', color: 'var(--muted)', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
            Loading walk...
          </div>
        )}

        {/* Dev-only coordinate picker readout (?coords) */}
        {coordsMode && (
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'var(--overlay)', border: '1px solid var(--orange)', borderRadius: 8, padding: '8px 14px', zIndex: 1001, backdropFilter: 'blur(8px)', textAlign: 'center', maxWidth: 'calc(100% - 32px)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: clickedCoord ? 4 : 0 }}>Coords mode - tap the map to copy a point</p>
            {clickedCoord && <p style={{ fontFamily: 'monospace', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--orange)' }}>{clickedCoord} <span style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>copied</span></p>}
          </div>
        )}

        {!selected && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🥾</div>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--faint)' }}>{isMobile ? 'Tap a walk above' : 'Select a walk from the list'}</p>
          </div>
        )}

        {/* Collapsed peek bar - keeps the route on the map; tap to reopen details */}
        {selected && !cardOpen && (
          <div style={{
            position: 'absolute',
            ...(isMobile ? { bottom: 16, left: 16, right: 16 } : { top: 16, right: 16, maxWidth: 300 }),
            zIndex: 1000, background: 'var(--overlay)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-2)', borderRadius: 12, padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <button onClick={() => setCardOpen(true)} style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', padding: 0,
            }}>
              <DifficultyBadge difficulty={selected.difficulty} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected.name}</span>
              <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600, flexShrink: 0 }}>↑</span>
            </button>
            <button onClick={clearSelection} aria-label="Clear walk" style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        )}

        {selected && cardOpen && (
          <div style={{
            position: 'absolute',
            ...(isMobile ? { bottom: 16, left: 16, right: 16 } : { top: 16, right: 16, maxWidth: 300 }),
            zIndex: 1000, background: 'var(--overlay)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--border-2)', borderRadius: 12, padding: isMobile ? '12px 16px' : 20,
            maxHeight: isMobile ? '58%' : 'calc(100% - 32px)', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 6 : 10 }}>
              <div style={{ flex: 1 }}>
                {!isMobile && <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 4 }}>Selected walk</p>}
                <p style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, lineHeight: 1.3, color: 'var(--white)' }}>{selected.name}</p>
              </div>
              <button onClick={() => setCardOpen(false)} aria-label="Collapse details" style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}>
                ×
              </button>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <DifficultyBadge difficulty={selected.difficulty} />
              <span style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600 }}>{selected.distance_km} km</span>
              <span style={{ fontSize: 12, color: 'var(--faint)' }}>~{time(selected)} walk</span>
            </div>

            {/* Description (now shown on mobile too) */}
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dim)', lineHeight: 1.5, marginBottom: 10 }}>{selected.description}</p>

            {/* Direct people to the historic maps - switches the base layer in one tap */}
            {HAS_MAPTILER && (
              <button
                onClick={() => setActiveLayerId(activeLayerId === 'h1888' ? 'auto' : 'h1888')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  fontFamily: 'Inter, sans-serif', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer',
                  padding: '9px 12px', borderRadius: 8, marginBottom: 12,
                  border: `1px solid ${activeLayerId === 'h1888' ? 'var(--orange)' : 'var(--border-2)'}`,
                  background: activeLayerId === 'h1888' ? 'rgba(245,166,35,0.10)' : 'var(--card)',
                  color: activeLayerId === 'h1888' ? 'var(--orange)' : 'var(--white)',
                }}>
                <span style={{ fontSize: 14 }}>🕰</span>
                {activeLayerId === 'h1888' ? 'Back to the modern map' : 'See this area in 1888'}
              </button>
            )}

            {!!selected.stages?.length && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 6 }}>Heritage stops</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selected.stages.map((s, i) => (
                    <button key={i} onClick={() => {
                      const m = stageMarkersRef.current[i]
                      if (!m) return
                      // On mobile the card covers the map, so collapse it first
                      // so the pin and its popup are visible.
                      if (isMobile) setCardOpen(false)
                      mapObjRef.current?.panTo(m.getLatLng())
                      m.openPopup()
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif', background: 'var(--card)', border: '1px solid var(--border-2)',
                      borderRadius: 8, padding: '7px 9px',
                    }}>
                      <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: '#f5a623', color: '#0a0a0a', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--white)' }}>{s.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 2 }}>Accessibility</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.5 }}>{selected.accessibility}</p>
            </div>

            <GpxButton file={selected.file} />
          </div>
        )}
      </div>
    </div>
  )
}
