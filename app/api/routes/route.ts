import { NextRequest, NextResponse } from 'next/server'
import { ROUTES } from '@/lib/routes'
import { getRouteOverrides } from '@/lib/routeDescriptions'

/**
 * GET /api/routes
 * Public read-only catalogue for the native app: the static lib/routes.ts
 * merged with the route_descriptions DB overrides (same merge the routes
 * page does), plus absolute asset URLs. The site remains the single source
 * of truth - the app never bundles a snapshot.
 * Map URLs point at the LIGHT webp set only: the app shows light map
 * imagery in both themes (Pencil session decision, app-only).
 */
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const overrides = await getRouteOverrides().catch(() => ({}) as Record<string, never>)

  const routes = ROUTES.map(r => {
    const o = (overrides as Record<string, { name?: string; description?: string }>)[r.slug] ?? {}
    return {
      slug: r.slug,
      name: o.name ?? r.name,
      description: o.description ?? r.description ?? '',
      category: r.category,
      terrain: r.terrain,
      distance_km: r.distance_km,
      elevation_m: r.elevation_m ?? null,
      center: r.center,
      gpx_url: `${origin}/gpx/${r.file}`,
      strava_url: r.strava ?? null,
      map_url: `${origin}/route-maps/light/${r.slug}.webp`,
    }
  })

  return NextResponse.json({ routes })
}
