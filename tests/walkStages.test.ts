import { describe, it, expect } from 'vitest'
import { pointAtFraction, resolveStages, parseGpxCoords } from '@/lib/walkStages'
import type { Stage } from '@/lib/walks'

// Server-side fraction -> point resolution for GET /api/walks `stages`.
// Decision record: docs/RUNNER_HOME_BRIEF.md - must match WalksClient.tsx's
// client-side pointAtFraction exactly, so app and PWA agree on placement.
describe('pointAtFraction', () => {
  // A simple three-point line, roughly 1km total (each leg ~0.5km of latitude).
  const coords: [number, number][] = [
    [53.5, -2.3],
    [53.5045, -2.3], // ~500m north
    [53.509, -2.3], // ~500m north again
  ]

  it('fraction 0 returns the first coordinate (start of the route)', () => {
    expect(pointAtFraction(coords, 0)).toEqual(coords[0])
  })

  it('fraction 1 returns the last coordinate (end of the route)', () => {
    expect(pointAtFraction(coords, 1)).toEqual(coords[2])
  })

  it('a mid fraction lands proportionally along the line', () => {
    const [lat, lon] = pointAtFraction(coords, 0.5)
    // Halfway along a roughly-straight three-point line should sit close to
    // the midpoint coordinate.
    expect(lat).toBeCloseTo(coords[1][0], 3)
    expect(lon).toBeCloseTo(coords[1][1], 3)
  })

  it('clamps fractions outside 0..1', () => {
    expect(pointAtFraction(coords, -0.2)).toEqual(coords[0])
    expect(pointAtFraction(coords, 1.5)).toEqual(coords[2])
  })
})

describe('resolveStages', () => {
  const coords: [number, number][] = [
    [53.5, -2.3],
    [53.5045, -2.3],
    [53.509, -2.3],
  ]

  it('resolves a fraction stage to a [lng, lat] point derived from the route', () => {
    const stages: Stage[] = [{ title: 'Start', blurb: 'b', fraction: 0 }]
    const resolved = resolveStages(stages, coords)
    expect(resolved).toEqual([{ index: 0, title: 'Start', blurb: 'b', point: [-2.3, 53.5] }])
  })

  it('passes an explicit `at` point through unresolved, converted to [lng, lat]', () => {
    const stages: Stage[] = [{ title: 'Bridge', blurb: 'b', at: [53.5632, -2.3211] }]
    const resolved = resolveStages(stages, coords)
    expect(resolved[0].point).toEqual([-2.3211, 53.5632])
  })

  it('preserves stage order across mixed fraction/at stages', () => {
    const stages: Stage[] = [
      { title: 'First', blurb: 'b', fraction: 0.5 },
      { title: 'Second', blurb: 'b', at: [53.55, -2.31] },
      { title: 'Third', blurb: 'b', fraction: 1 },
    ]
    const resolved = resolveStages(stages, coords)
    expect(resolved.map((s) => s.title)).toEqual(['First', 'Second', 'Third'])
    expect(resolved.map((s) => s.index)).toEqual([0, 1, 2])
  })

  it('returns an empty array for walks without stages', () => {
    expect(resolveStages(undefined, coords)).toEqual([])
    expect(resolveStages([], coords)).toEqual([])
  })

  it('returns an empty array when coords are unavailable', () => {
    const stages: Stage[] = [{ title: 'Start', blurb: 'b', fraction: 0 }]
    expect(resolveStages(stages, [])).toEqual([])
  })
})

describe('parseGpxCoords', () => {
  it('parses trkpt coordinates', () => {
    const gpx = `<gpx><trk><trkseg><trkpt lat="53.1" lon="-2.1"></trkpt><trkpt lat="53.2" lon="-2.2"></trkpt></trkseg></trk></gpx>`
    expect(parseGpxCoords(gpx)).toEqual([
      [53.1, -2.1],
      [53.2, -2.2],
    ])
  })

  it('falls back to rtept when there are no trkpts', () => {
    const gpx = `<gpx><rte><rtept lat="53.1" lon="-2.1"></rtept></rte></gpx>`
    expect(parseGpxCoords(gpx)).toEqual([[53.1, -2.1]])
  })

  it('falls back to wpt when there are no trkpts or rtepts', () => {
    const gpx = `<gpx><wpt lat="53.1" lon="-2.1"></wpt></gpx>`
    expect(parseGpxCoords(gpx)).toEqual([[53.1, -2.1]])
  })
})
