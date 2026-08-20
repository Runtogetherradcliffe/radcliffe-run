import Link from 'next/link'
import { redirect } from 'next/navigation'
import { existsSync } from 'fs'
import { join } from 'path'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import ThemeMapImage from '@/components/ThemeMapImage'
import { ROUTES, Category } from '@/lib/routes'
import { getRouteOverrides } from '@/lib/routeDescriptions'

// Each catalogue route gets a real, citable page here with its description and
// GPX link (previously this path only redirected to /routes#<slug>). Slugs NOT
// in the catalogue - typos, or photo-only run slugs like
// social--boggart-hole-clough - still redirect to the library, so nothing 404s.

const CATEGORY_LABEL: Record<Category, string> = {
  'road-5k': 'Road 5k',
  'road-8k': 'Road 8k',
  'trail-5k': 'Trail 5k',
  'trail-8k': 'Trail 8k',
  'social-long-run': 'Social long run',
}

function truncate(text: string, max = 155): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const route = ROUTES.find(r => r.slug === slug)
  if (!route) return {}

  const overrides = await getRouteOverrides()
  const name = overrides[slug]?.name ?? route.name
  const description = overrides[slug]?.description ?? route.description

  const title = `${name} - ${route.distance_km}km ${route.terrain} running route in Radcliffe | radcliffe.run`
  const metaDescription = description
    ? truncate(description)
    : `A ${route.distance_km}km ${route.terrain} running route from Run Together Radcliffe, with map and free GPX download.`

  return {
    title,
    description: metaDescription,
    alternates: { canonical: `/routes/${slug}` },
    openGraph: { title, description: metaDescription, type: 'website' },
    twitter: { card: 'summary', title, description: metaDescription },
  }
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const route = ROUTES.find(r => r.slug === slug)
  if (!route) redirect('/routes')

  const overrides = await getRouteOverrides()
  const name = overrides[slug]?.name ?? route.name
  const description = overrides[slug]?.description ?? route.description

  const hasMapImage = existsSync(join(process.cwd(), 'public', 'route-maps', `${slug}.webp`))

  const placeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${name} running route`,
    ...(description ? { description } : {}),
    url: `https://www.radcliffe.run/routes/${slug}`,
    geo: { '@type': 'GeoCoordinates', latitude: route.center[0], longitude: route.center[1] },
    isAccessibleForFree: true,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Distance', value: `${route.distance_km} km` },
      { '@type': 'PropertyValue', name: 'Elevation gain', value: `${route.elevation_m} m` },
      { '@type': 'PropertyValue', name: 'Terrain', value: route.terrain },
    ],
  }

  const stats = [
    { label: 'Distance', value: `${route.distance_km} km` },
    { label: 'Elevation', value: `+${route.elevation_m}m` },
    { label: 'Terrain', value: route.terrain === 'road' ? 'Road' : 'Trail' },
  ]

  const buttonStyle: React.CSSProperties = {
    display: 'inline-block', padding: '12px 22px', borderRadius: 10,
    fontSize: 'var(--text-md)', fontWeight: 600, textDecoration: 'none',
    letterSpacing: '-0.01em',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd).replace(/</g, '\\u003c') }}
      />
      <Nav />
      <main style={{ minHeight: 'calc(100vh - 60px)', background: 'var(--bg)' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

          <Link href="/routes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--faint)', textDecoration: 'none', marginBottom: 32 }}>
            ← All routes
          </Link>

          <header style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 10 }}>
              {CATEGORY_LABEL[route.category]}
            </p>
            <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 18 }}>
              {name}
            </h1>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {stats.map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--faint)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--dim)' }}>{value}</p>
                </div>
              ))}
            </div>
          </header>

          {hasMapImage && (
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 24 }}>
              <ThemeMapImage
                slug={slug}
                alt={`Map of the ${name} route`}
                style={{ width: '100%', display: 'block', maxWidth: '100%' }}
              />
            </div>
          )}

          {description && (
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--muted)', lineHeight: 1.8, marginBottom: 32 }}>
              {description}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
            <Link href={`/routes#${slug}`} style={{ ...buttonStyle, background: 'var(--orange)', color: 'var(--bg)' }}>
              View on interactive map
            </Link>
            <a href={`/gpx/${route.file}`} download style={{ ...buttonStyle, background: 'var(--card)', color: 'var(--dim)', border: '1px solid var(--border-2)' }}>
              Download GPX
            </a>
            {route.strava && (
              <a href={route.strava} target="_blank" rel="noopener noreferrer" style={{ ...buttonStyle, background: 'var(--card)', color: 'var(--dim)', border: '1px solid var(--border-2)' }}>
                View on Strava
              </a>
            )}
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', lineHeight: 1.7 }}>
              This is one of the free running routes used by{' '}
              <Link href="/about" style={{ color: 'var(--orange)', textDecoration: 'none' }}>Run Together Radcliffe</Link>, a
              free running club meeting every Thursday at 7pm at Radcliffe Market.{' '}
              <Link href="/join" style={{ color: 'var(--orange)', textDecoration: 'none' }}>Everyone is welcome</Link>.
            </p>
          </div>

        </article>
      </main>
      <Footer />
    </>
  )
}
