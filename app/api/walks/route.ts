import { NextRequest, NextResponse } from 'next/server'
import { WALKS, walkingTimeMin } from '@/lib/walks'

/**
 * GET /api/walks
 * Tiny read-only mirror of lib/walks.ts for the app's solo card Walks
 * button. Anon read - walks are public site content, same as /api/routes.
 * Heritage `stages` are draft, unverified copy (see lib/walks.ts) and are
 * deliberately left out of this payload.
 */
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin

  const walks = WALKS.map((w) => ({
    slug: w.slug,
    name: w.name,
    distance_km: w.distance_km,
    elevation_m: w.elevation_m,
    center: w.center,
    difficulty: w.difficulty,
    accessibility: w.accessibility,
    description: w.description,
    time_min: w.timeOverrideMin ?? walkingTimeMin(w.distance_km, w.elevation_m),
    gpx_url: `${origin}/gpx/${w.file}`,
    route_slug: w.routeSlug ?? null,
  }))

  return NextResponse.json({ walks })
}
