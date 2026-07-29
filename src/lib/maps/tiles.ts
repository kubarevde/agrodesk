/** Central map tile config — used by MapView for all feature maps. */

export type MapBasemapId = 'satellite' | 'osm'

export type MapBasemapConfig = {
  id: MapBasemapId
  name: string
  url: string
  attribution: string
  maxZoom?: number
}

function normalizeTileUrl(url: string): string {
  if (url.startsWith('http://')) return url.replace(/^http:\/\//, 'https://')
  return url
}

const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
/** Compact required credit — no Leaflet brand prefix (set separately on AttributionControl). */
const ESRI_SATELLITE_ATTR = '&copy; <a href="https://www.esri.com/" rel="noopener noreferrer">Esri</a>'

const OSM_DEFAULT_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_DEFAULT_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a>'

function envString(key: string): string | undefined {
  const value = import.meta.env[key] as string | undefined
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

export function getOsmBasemap(): MapBasemapConfig {
  return {
    id: 'osm',
    name: 'Схема',
    url: normalizeTileUrl(envString('VITE_MAP_TILES_URL') ?? OSM_DEFAULT_URL),
    attribution: envString('VITE_MAP_TILES_ATTRIBUTION') ?? OSM_DEFAULT_ATTR,
    maxZoom: 19,
  }
}

export function getSatelliteBasemap(): MapBasemapConfig {
  return {
    id: 'satellite',
    name: 'Спутник',
    url: normalizeTileUrl(envString('VITE_MAP_SATELLITE_URL') ?? ESRI_SATELLITE_URL),
    attribution: envString('VITE_MAP_SATELLITE_ATTRIBUTION') ?? ESRI_SATELLITE_ATTR,
    maxZoom: 19,
  }
}

export function getDefaultBasemapId(): MapBasemapId {
  const raw = envString('VITE_MAP_DEFAULT_BASEMAP')?.toLowerCase()
  if (raw === 'osm' || raw === 'schema' || raw === 'streets') return 'osm'
  return 'satellite'
}

export function getBasemaps(): MapBasemapConfig[] {
  return [getSatelliteBasemap(), getOsmBasemap()]
}
