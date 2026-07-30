/**
 * Lightweight place search for field maps.
 *
 * Provider: OpenStreetMap Nominatim (same OSM ecosystem as our schema tiles).
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * - Identify the app (User-Agent / Referer)
 * - Max ~1 request/sec; no bulk scraping
 * - Cache results on the client when practical
 * Cadastre / Rosreestr is intentionally NOT used (see docs/maps.md).
 */

export type GeocodeResult = {
  id: string
  label: string
  lat: number
  lng: number
  /** Bounding box south, north, west, east when Nominatim provides it. */
  bbox?: [number, number, number, number]
}

export type GeocodeSearchOptions = {
  /** Abort in-flight request (debounce). */
  signal?: AbortSignal
  /** Max suggestions (Nominatim limit=). */
  limit?: number
  /** Language preference, e.g. `ru`. */
  language?: string
  /** Injected fetch for tests. */
  fetchImpl?: typeof fetch
  /** Override online check (tests). */
  isOnline?: () => boolean
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
/** Product identification required by Nominatim usage policy. */
const USER_AGENT = 'AgroDesk/5.0 (field map location search; https://github.com/kubarevde/agrodesk)'

/** Match "51.5, 36.2" or "51.5 36.2" (lat lng). */
const COORD_PAIR =
  /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

export function parseCoordinateQuery(query: string): GeocodeResult | null {
  const match = COORD_PAIR.exec(query.trim())
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return {
    id: `coord:${lat},${lng}`,
    label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    lat,
    lng,
  }
}

type NominatimItem = {
  place_id?: number | string
  display_name?: string
  lat?: string
  lon?: string
  boundingbox?: string[]
}

function mapNominatimItem(item: NominatimItem, index: number): GeocodeResult | null {
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const label = (item.display_name || '').trim() || `${lat}, ${lng}`
  let bbox: GeocodeResult['bbox']
  if (item.boundingbox && item.boundingbox.length >= 4) {
    const south = Number(item.boundingbox[0])
    const north = Number(item.boundingbox[1])
    const west = Number(item.boundingbox[2])
    const east = Number(item.boundingbox[3])
    if ([south, north, west, east].every(Number.isFinite)) {
      bbox = [south, north, west, east]
    }
  }
  return {
    id: String(item.place_id ?? `n:${index}:${lat},${lng}`),
    label,
    lat,
    lng,
    bbox,
  }
}

/**
 * Search places via Nominatim, or parse a lat/lng pair typed by the user.
 * When offline, returns [] (no throw) so the map form stays usable.
 */
export async function searchPlaces(
  query: string,
  options: GeocodeSearchOptions = {},
): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const online = options.isOnline ?? (() =>
    typeof navigator === 'undefined' ? true : navigator.onLine)
  if (!online()) return []

  const coord = parseCoordinateQuery(trimmed)
  if (coord) return [coord]

  const limit = Math.min(Math.max(options.limit ?? 5, 1), 10)
  const language = options.language ?? 'ru'
  const fetchImpl = options.fetchImpl ?? fetch

  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'json')
  url.searchParams.set('addressdetails', '0')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('accept-language', language)

  try {
    const response = await fetchImpl(url.toString(), {
      method: 'GET',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    })
    if (!response.ok) return []
    const data = (await response.json()) as unknown
    if (!Array.isArray(data)) return []
    const results: GeocodeResult[] = []
    for (let i = 0; i < data.length; i += 1) {
      const mapped = mapNominatimItem(data[i] as NominatimItem, i)
      if (mapped) results.push(mapped)
    }
    return results
  } catch (error) {
    if (options.signal?.aborted) return []
    if (error instanceof DOMException && error.name === 'AbortError') return []
    return []
  }
}

export function geocodeResultZoom(result: GeocodeResult): number {
  if (result.bbox) {
    const [south, north, west, east] = result.bbox
    const span = Math.max(Math.abs(north - south), Math.abs(east - west))
    if (span > 1) return 10
    if (span > 0.2) return 12
    if (span > 0.05) return 14
    return 15
  }
  return 14
}

/** Build map fly/fit target used by FieldContourEditor / FieldsMap. */
export function buildMapFlyTarget(result: GeocodeResult): {
  lat: number
  lng: number
  zoom: number
  bbox?: [number, number, number, number]
} {
  return {
    lat: result.lat,
    lng: result.lng,
    zoom: geocodeResultZoom(result),
    bbox: result.bbox,
  }
}
