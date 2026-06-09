/**
 * Shared client-side Leaflet loader. Dynamically imports the library plus its
 * CSS and normalises the CJS/ESM default-export difference in one place, so
 * map components get a fully typed `typeof Leaflet` instead of `any`.
 */
import type * as Leaflet from 'leaflet'

export type { Leaflet }

/** Leaflet stamps `_leaflet_id` onto its container element; we delete it on
 *  cleanup so a remount can re-initialise the same div. */
export type LeafletContainer = HTMLElement & { _leaflet_id?: number }

export async function loadLeaflet(): Promise<typeof Leaflet> {
  const [mod] = await Promise.all([
    import('leaflet'),
    import('leaflet/dist/leaflet.css'),
  ])
  const m = mod as unknown as { default?: typeof Leaflet }
  return m.default ?? (mod as unknown as typeof Leaflet)
}
