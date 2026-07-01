/**
 * meeting_map_url normally holds a pasted Google Maps share link, but it may
 * instead hold a "lat, lng" pair (e.g. long-pressed off the Google Maps pin).
 * Coordinates let us build an exact link for both Google and Apple Maps -
 * a pasted share URL only reliably opens Google Maps, since Apple Maps has
 * no way to read a Google URL and has to fall back to geocoding free text.
 */
export function parseCoords(value: string): { lat: number; lng: number } | null {
  const m = value.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!m) return null
  const lat = parseFloat(m[1])
  const lng = parseFloat(m[2])
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

/** A clickable Google Maps URL for whatever meeting_map_url holds - a coordinate pair or a URL already. */
export function googleMapsHref(value: string): string {
  const coords = parseCoords(value)
  return coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : value
}
