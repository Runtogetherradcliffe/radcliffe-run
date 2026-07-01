/**
 * Extract the lat/lng pin behind a Google Maps link. Short links
 * (maps.app.goo.gl) redirect to a URL that has the coordinates in it -
 * resolved once at sync time and cached on the run row, so run pages never
 * need a live network call, and the sheet keeps holding a normal Google
 * Maps URL that the calendar script and other consumers still understand.
 */

const COORD_PATTERNS = [
  /maps\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/,  // .../maps/search/<lat>,+<lng>
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,                   // .../@<lat>,<lng>,<zoom>z
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,               // place link data blob
]

function extractCoords(text: string): { lat: number; lng: number } | null {
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
