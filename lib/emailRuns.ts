import type { SupabaseClient } from '@supabase/supabase-js'
import type { RunInfo } from '@/lib/buildEmail'
import { ROUTES } from '@/lib/routes'
import { getRouteOverrides } from '@/lib/routeDescriptions'

/**
 * The runs a weekly email shows, shared by the send and the preview (Nov 2026).
 *
 * The general email (to all runners, or chosen members) shows that Thursday's
 * club runs only: never socials, and never C25K sessions, which belong to the
 * cohort's own area (Paul, 18 Nov 2026). An email to the C25K cohort
 * (recipient_filter 'c25k') shows that week's C25K sessions instead: the
 * Tuesday and Thursday sessions around the chosen Thursday, plus the
 * graduation parkrun when it falls that Saturday.
 */
export function isC25kEmail(recipientFilter: string | null | undefined): boolean {
  return recipientFilter === 'c25k'
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function loadEmailRuns(
  db: SupabaseClient,
  thursdayDate: string,
  recipientFilter: string | null | undefined,
): Promise<RunInfo[]> {
  const cols = 'id, date, title, description, route_slug, distance_km, terrain, meeting_point, meeting_map_url, on_tour, has_jeffing, cancelled, run_type, start_time'
  const query = isC25kEmail(recipientFilter)
    ? db.from('runs').select(cols)
        .eq('run_type', 'c25k')
        .eq('cancelled', false)
        .gte('date', addDays(thursdayDate, -2))
        .lte('date', addDays(thursdayDate, 2))
        .order('date', { ascending: true })
    : db.from('runs').select(cols)
        .eq('date', thursdayDate)
        .eq('cancelled', false)
        .not('run_type', 'in', '(social,c25k)')
        .order('distance_km', { ascending: true })

  const { data: runRows } = await query
  const overrides = await getRouteOverrides()

  return (runRows ?? []).map(r => {
    const route = r.route_slug ? ROUTES.find(ro => ro.slug === r.route_slug) : null
    return {
      date:            r.date,
      title:           r.title,
      distance_km:     r.distance_km,
      description:     (r.route_slug && overrides[r.route_slug]?.description) ? overrides[r.route_slug].description! : (route?.description ?? r.description ?? null),
      route_slug:      r.route_slug,
      meeting_point:   r.meeting_point,
      meeting_map_url: r.meeting_map_url ?? null,
      on_tour:         r.on_tour ?? false,
      has_jeffing:     r.has_jeffing ?? false,
      terrain:         r.terrain,
      run_type:        r.run_type ?? null,
      start_time:      r.start_time ?? null,
    }
  })
}
