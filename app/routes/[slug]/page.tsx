import { redirect } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

// Redirects path-style route links (e.g. /routes/trail-5k--outwood-to-ringley)
// to the hash-based selection the routes page uses (/routes#<slug>).
// Older emails built links with a path segment instead of a fragment, so this
// keeps those already-delivered links working.
export default async function RouteRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const exists = ROUTES.some((r) => r.slug === slug)
  redirect(exists ? `/routes#${slug}` : '/routes')
}
