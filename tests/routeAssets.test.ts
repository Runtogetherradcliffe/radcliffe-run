/**
 * Catalogue integrity for lib/routes.ts.
 *
 * Every route needs its GPX file and BOTH theme map images (dark and light) -
 * a route shipped without one of these renders a broken card. Run card image
 * lookups check .webp specifically, so the formats here are load-bearing.
 */
import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import path from 'path'
import { ROUTES } from '@/lib/routes'

const PUB = path.join(__dirname, '..', 'public')

describe('route catalogue integrity', () => {
  it('has no duplicate slugs', () => {
    const slugs = ROUTES.map(r => r.slug)
    const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i)
    expect(dupes).toEqual([])
  })

  it('every route has its GPX file in public/gpx', () => {
    const missing = ROUTES.filter(r => !existsSync(path.join(PUB, 'gpx', r.file)))
    expect(missing.map(r => r.slug)).toEqual([])
  })

  it('every route has a dark map image (public/route-maps/<slug>.webp)', () => {
    const missing = ROUTES.filter(r => !existsSync(path.join(PUB, 'route-maps', `${r.slug}.webp`)))
    expect(missing.map(r => r.slug)).toEqual([])
  })

  it('every route has a light map image (public/route-maps/light/<slug>.webp)', () => {
    const missing = ROUTES.filter(r => !existsSync(path.join(PUB, 'route-maps', 'light', `${r.slug}.webp`)))
    expect(missing.map(r => r.slug)).toEqual([])
  })

  it('gpx filename matches the slug', () => {
    const mismatched = ROUTES.filter(r => r.file !== `${r.slug}.gpx`)
    expect(mismatched.map(r => r.slug)).toEqual([])
  })
})
