/**
 * Shared map base-layer definitions for the route maps (routes library + run
 * detail page). Modern base maps work without any key; the historic Ordnance
 * Survey overlays are served by MapTiler from the National Library of Scotland
 * archive and need a free NEXT_PUBLIC_MAPTILER_KEY to render.
 */

const TF_KEY       = process.env.NEXT_PUBLIC_THUNDERFOREST_API_KEY
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY

export const HAS_MAPTILER = !!MAPTILER_KEY

const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
const NLS_ATTR = 'Historic maps © <a href="https://maps.nls.uk/">National Library of Scotland</a> · © <a href="https://www.maptiler.com/copyright/">MapTiler</a>'

export type MapLayer = {
  id: string
  label: string
  sub: string
  url: string
  attr: string
  maxZoom: number
  historic?: boolean
}

// Modern base maps - all render without a MapTiler key.
export const BASE_LAYERS: MapLayer[] = [
  { id: 'road',      label: 'Standard',    sub: 'Street map',        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',                              attr: '© OpenStreetMap © CARTO',                  maxZoom: 19 },
  { id: 'outdoors',  label: 'Outdoors',    sub: 'Trails & terrain',  url: `https://api.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${TF_KEY}`,                                attr: `© <a href="https://www.thunderforest.com">Thunderforest</a> · ${OSM_ATTR}`, maxZoom: 19 },
  { id: 'satellite', label: 'Satellite',   sub: 'Aerial imagery',    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',          attr: 'Imagery © Esri',                           maxZoom: 19 },
  { id: 'topo',      label: 'Topographic', sub: 'Contours & relief', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                                                      attr: `© OpenTopoMap (CC-BY-SA) · ${OSM_ATTR}`,   maxZoom: 17 },
]

// Historic OS maps via MapTiler / National Library of Scotland. Both are the
// most detailed digitised editions for their period (six-inch and 1:25,000);
// the one-inch editions for the 1920s/1950s exist but are far coarser.
export const HISTORIC_LAYERS: MapLayer[] = [
  { id: 'h1888', label: '1888-1913', sub: 'Six inch',  url: `https://api.maptiler.com/tiles/uk-osgb10k1888/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`, attr: NLS_ATTR, maxZoom: 17, historic: true },
  { id: 'h1937', label: '1937-61',   sub: '1:25,000',  url: `https://api.maptiler.com/tiles/uk-osgb25k1937/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`, attr: NLS_ATTR, maxZoom: 16, historic: true },
]

export const ALL_LAYERS: MapLayer[] = [...BASE_LAYERS, ...HISTORIC_LAYERS]

/**
 * Resolve a layer id to its definition. The special id 'auto' tracks the
 * route's terrain (trail -> outdoors, anything else -> standard street map).
 */
export function resolveLayer(id: string, terrain?: string): MapLayer {
  if (id === 'auto') return BASE_LAYERS.find(l => l.id === (terrain === 'trail' ? 'outdoors' : 'road'))!
  return ALL_LAYERS.find(l => l.id === id) ?? BASE_LAYERS[0]
}
