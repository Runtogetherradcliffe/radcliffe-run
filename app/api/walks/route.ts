import { NextRequest, NextResponse } from 'next/server'
import { WALKS, walkingTimeMin } from '@/lib/walks'
import { loadGpxCoords, resolveStages, type ResolvedStage } from '@/lib/walkStages'

/**
 * GET /api/walks
 * Tiny read-only mirror of lib/walks.ts for the app's solo card Walks
 * button. Anon read - walks are public site content, same as /api/routes.
 *
 * `stages` (heritage stops) are resolved here, server-side, against each
 * walk's GPX - the app holds no geometry logic (RUNNER_HOME_BRIEF.md,
 * backend-first). This mirrors what WalksClient.tsx does client-side at
 * draw time for the PWA (same haversine/pointAtFraction algorithm, see
 * lib/walkStages.ts), so both surfaces place stops identically. `stages`
 * content is still DRAFT copy per lib/walks.ts's own header - unverified
 * against the ground, same caveat as `accessibility` - but is now served to
 * both web and app equally (see decision record below).
 */
export const revalidate = 3600

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin

  const walks = WALKS.map((w) => {
    let stages: ResolvedStage[] = []
    if (w.stages?.length) {
      try {
        stages = resolveStages(w.stages, loadGpxCoords(w.file))
      } catch {
        stages = []
      }
    }
    return {
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
      stages,
    }
  })

  return NextResponse.json({ walks })
}
