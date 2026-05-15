'use client'

import { useEffect, useRef } from 'react'

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const φ1 = a[0] * Math.PI / 180, φ2 = b[0] * Math.PI / 180
  const dφ = (b[0] - a[0]) * Math.PI / 180
  const dλ = (b[1] - a[1]) * Math.PI / 180
  const s = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function arrowIcon(L: any, deg: number) {
  return L.divIcon({
    className: '',
    html: `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:10px solid #f5a623;transform:rotate(${deg}deg);transform-origin:center center;filter:drop-shadow(0 0 2px rgba(0,0,0,0.8))"></div>`,
    iconSize: [10, 10], iconAnchor: [5, 5],
  })
}

function parseGPX(xml: string): [number, number][] {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(xml, 'application/xml')
  const pts    = doc.querySelectorAll('trkpt')
  if (!pts.length) return []
  return Array.from(pts).map(pt => [
    parseFloat(pt.getAttribute('lat')!),
    parseFloat(pt.getAttribute('lon')!),
  ])
}

interface RunMapProps {
  gpxFile: string
  center: [number, number]
  onTour?: boolean
  meetingLabel?: string
}

const MARKET_COORDS: [number, number] = [53.5609, -2.3265]

export default function RunMap({ gpxFile, center, onTour = false, meetingLabel = 'Radcliffe Market' }: RunMapProps) {
  const mapRef    = useRef<HTMLDivElement>(null)
  const mapObjRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || mapObjRef.current) return
    let cancelled = false

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css' as any),
    ]).then(async ([L]) => {
      if (cancelled || mapObjRef.current || !mapRef.current) return
      const Lx = L.default || L

      const map = Lx.map(mapRef.current, { center, zoom: 14, zoomControl: true })
      mapObjRef.current = map

      Lx.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }
      ).addTo(map)

      // Meeting point marker — will be placed after GPX loads for on-tour runs
      const meetIcon = Lx.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#f5a623;border:2.5px solid #fff;box-shadow:0 0 0 4px rgba(245,166,35,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      })

      // For non-tour runs, place the Radcliffe Market marker immediately
      if (!onTour) {
        Lx.marker(MARKET_COORDS, { icon: meetIcon }).addTo(map)
          .bindPopup(`<b style="font-family:Inter,sans-serif;font-size:13px"><a href="https://maps.app.goo.gl/d1FUYuqmNVpsWUs99" target="_blank" style="color:inherit;text-decoration:none">Radcliffe Market ↗</a></b><br><span style="font-size:12px;color:#888">Meeting point · 7pm · 11 Blackburn St</span>`)
      }

      // Load GPX
      try {
        const res = await fetch(`/gpx/${gpxFile}`)
        if (!res.ok || cancelled) return
        const coords = parseGPX(await res.text())
        if (!coords.length || cancelled) return

        // For on-tour runs, place the meeting point marker at the GPX start
        if (onTour && coords[0]) {
          Lx.marker(coords[0], { icon: meetIcon }).addTo(map)
            .bindPopup(`<b style="font-family:Inter,sans-serif;font-size:13px">${meetingLabel}</b><br><span style="font-size:12px;color:#888">Meeting point · 7pm</span>`)
        }

        // Route lines: amber glow + orange main
        Lx.polyline(coords, { color: '#7a4800', weight: 5, opacity: 0.9 }).addTo(map)
        Lx.polyline(coords, { color: '#f5a623', weight: 3, opacity: 1   }).addTo(map)

        // Direction arrows every 800m
        const ARROW_INTERVAL = 800
        let distAcc = 0
        const arrowMarkers: any[] = []
        for (let i = 1; i < coords.length; i++) {
          distAcc += haversine(coords[i - 1], coords[i])
          if (distAcc >= ARROW_INTERVAL) {
            distAcc = 0
            const [lat1, lon1] = coords[i - 1]
            const [lat2, lon2] = coords[i]
            const deg = Math.atan2(lon2 - lon1, lat2 - lat1) * 180 / Math.PI
            const mid: [number, number] = [(lat1 + lat2) / 2, (lon1 + lon2) / 2]
            arrowMarkers.push(Lx.marker(mid, { icon: arrowIcon(Lx, deg), interactive: false }).addTo(map))
          }
        }

        map.fitBounds(Lx.latLngBounds(coords), { padding: [24, 24] })
      } catch { /* gpx load failed silently */ }
    })

    return () => {
      cancelled = true
      mapObjRef.current?.remove()
      mapObjRef.current = null
      if (mapRef.current) delete (mapRef.current as any)._leaflet_id
    }
  }, [gpxFile, center, onTour, meetingLabel])

  return (
    <div ref={mapRef} style={{ height: 360, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }} />
  )
}
