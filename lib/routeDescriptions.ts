import { supabaseAdmin } from '@/lib/supabase'

export type RouteOverrides = Record<string, { name?: string; description?: string }>

export async function getRouteOverrides(): Promise<RouteOverrides> {
  const { data } = await supabaseAdmin()
    .from('route_descriptions')
    .select('slug, name, description')

  const map: RouteOverrides = {}
  for (const row of data ?? []) {
    map[row.slug] = {}
    if (row.name) map[row.slug].name = row.name
    if (row.description) map[row.slug].description = row.description
  }
  return map
}
