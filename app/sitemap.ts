import { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radcliffe.run'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL,                  changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/about`,       changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/routes`,      changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/join`,        changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/news`,        changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/privacy`,     changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Published news/roundup posts
  const { data: posts } = await supabaseAdmin()
    .from('posts')
    .select('slug, published_at')
    .eq('published', true)
    .not('slug', 'is', null)

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map(p => ({
    url: `${SITE_URL}/news/${p.slug}`,
    lastModified: p.published_at ? new Date(p.published_at) : undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Upcoming non-cancelled runs
  const today = new Date().toISOString().slice(0, 10)
  const { data: runs } = await supabaseAdmin()
    .from('runs')
    .select('id, date')
    .eq('cancelled', false)
    .gte('date', today)
    .order('date', { ascending: true })

  const runRoutes: MetadataRoute.Sitemap = (runs ?? []).map(r => ({
    url: `${SITE_URL}/runs/${r.id}`,
    lastModified: new Date(r.date),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...postRoutes, ...runRoutes]
}
