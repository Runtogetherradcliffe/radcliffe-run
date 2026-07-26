/**
 * Extract the lat/lng pin behind a Google Maps link. Short links
 * (maps.app.goo.gl) redirect to a URL that has the coordinates in it -
 * resolved once at sync time and cached on the run row, so run pages never
 * need a live network call, and the sheet keeps holding a normal Google
 * Maps URL that the calendar script and other consumers still understand.
 */

// Order matters, and it is the whole point of this list. Sharing a meeting point
// from Google Maps produces one of two link shapes:
//
//   long-press the map, then Share  ->  .../maps/search/<lat>,+<lng>
//                                       one location, nothing to get wrong
//   search a name, then Share       ->  .../maps/place/Name/@<framing>/data=...!3d<pin>!4d<pin>
//                                       TWO locations: the place itself (!3d!4d)
//                                       and where the map was framed on screen
//                                       when it was shared (@...)
//
// Those two are not the same point. On the club's own market link they sit about
// 170 m apart, and on a car park shared this way the gap has been up to ~300 m.
// The place's own pin is what a member needs, so it must be tried BEFORE the
// framing. The framing stays last as a fallback for a link that carries no pin.
// (Fixed 26 Jul 2026, after the same defect was caught by a test in the native
// apps' port of this file: apps/abingdon/src/lib/format.ts and social.py.)
const COORD_PATTERNS = [
  /maps\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/,  // .../maps/search/<lat>,+<lng>
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,               // the place's own pin
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,                   // only the map framing
]

export function extractCoords(text: string): { lat: number; lng: number } | null {
  for (const pattern of COORD_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const lat = parseFloat(m[1])
      const lng = parseFloat(m[2])
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng }
    }
  }
  try {
    const q = new URL(text).searchParams.get('q')
    const qm = q?.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/)
    if (qm) return { lat: parseFloat(qm[1]), lng: parseFloat(qm[2]) }
  } catch {
    // not a URL - fall through
  }
  return null
}

/** Resolve the lat/lng pin behind a Google Maps URL, following a short-link redirect if needed. */
export async function resolveMapCoords(mapUrl: string): Promise<{ lat: number; lng: number } | null> {
  const direct = extractCoords(mapUrl)
  if (direct) return direct

  try {
    const res = await fetch(mapUrl, { redirect: 'manual' })
    const location = res.headers.get('location')
    return location ? extractCoords(location) : null
  } catch {
    return null
  }
}
