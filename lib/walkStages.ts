import { readFileSync } from 'fs'
import { join } from 'path'
import type { Stage } from '@/lib/walks'

/**
 * Server-side mirror of the fraction -> point resolution app/walks/WalksClient.tsx
 * does client-side at draw time (haversine + pointAtFraction). Kept numerically
 * identical so a stage lands in the same spot whether resolved here (for the
 * native app, which holds no GPX/geometry logic - RUNNER_HOME_BRIEF.md) or by
 * the PWA client-side against the same GPX file.
 */

type LatLon = [number, number] // [lat, lon], matching the GPX/Leaflet convention

const TRKPT_RE = /<trkpt\b[^>]*\blat="(-?[0-9.]+)"[^>]*\blon="(-?[0-9.]+)"/g
const RTEPT_RE = /<rtept\b[^>]*\blat="(-?[0-9.]+)"[^>]*\blon="(-?[0-9.]+)"/g
const WPT_RE = /<wpt\b[^>]*\blat="(-?[0-9.]+)"[^>]*\blon="(-?[0-9.]+)"/g

function matchAll(text: string, re: RegExp): LatLon[] {
  const out: LatLon[] = []
  let m: RegExpExecArray | null
  re.lastIndex = 0
  while ((m = re.exec(text))) out.push([parseFloat(m[1]), parseFloat(m[2])])
  return out
}

/** Mirrors WalksClient.tsx's loadGPXCoords precedence: trkpt, then rtept, then wpt. */
export function parseGpxCoords(gpxText: string): LatLon[] {
  const trkpts = matchAll(gpxText, TRKPT_RE)
  if (trkpts.length > 0) return trkpts
  const rtepts = matchAll(gpxText, RTEPT_RE)
  if (rtepts.length > 0) return rtepts
  return matchAll(gpxText, WPT_RE)
}

function haversine(a: LatLon, b: LatLon): number {
  const R = 6371000
  const p1 = (a[0] * Math.PI) / 180
  const p2 = (b[0] * Math.PI) / 180
  const dp = ((b[0] - a[0]) * Math.PI) / 180
  const dl = ((b[1] - a[1]) * Math.PI) / 180
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** Point at a fraction (0..1) of the route length - identical algorithm to
 * WalksClient.tsx's pointAtFraction, so app and PWA agree on stage placement. */
export function pointAtFraction(coords: LatLon[], frac: number): LatLon {
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
      return [
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ]
    }
    acc += d
  }
  return coords[coords.length - 1]
}

export interface ResolvedStage {
  index: number
  title: string
  blurb: string
  point: [number, number] // [lng, lat] - GeoJSON order, for the app
}

/** Resolves each stage's `at` or `fraction` against the walk's GPX coords,
 * preserving order. `at` passes through unresolved (already an explicit point). */
export function resolveStages(stages: Stage[] | undefined, coords: LatLon[]): ResolvedStage[] {
  if (!stages?.length || coords.length === 0) return []
  return stages.map((s, index) => {
    const [lat, lon] = s.at ?? pointAtFraction(coords, s.fraction ?? 0)
    return { index, title: s.title, blurb: s.blurb, point: [lon, lat] }
  })
}

export function loadGpxCoords(file: string): LatLon[] {
  const text = readFileSync(join(process.cwd(), 'public', 'gpx', file), 'utf-8')
  return parseGpxCoords(text)
}
