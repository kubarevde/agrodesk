/** Field contour helpers — [lat, lng] rings, weather centroid, area (ha). */

export type LatLngPair = [number, number]

/** Parse user input: trim, comma→dot, empty → undefined (never NaN). */
export function parseCoord(raw: unknown): number | undefined {
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : undefined
  }
  const text = String(raw).trim().replace(/\s+/g, '').replace(',', '.')
  if (!text || text === '-' || text === '.' || text === '-.') return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

export function isValidLatitude(value: number | undefined | null): value is number {
  return value != null && Number.isFinite(value) && value >= -90 && value <= 90
}

export function isValidLongitude(value: number | undefined | null): value is number {
  return value != null && Number.isFinite(value) && value >= -180 && value <= 180
}

export function isValidLatLng(
  lat: number | undefined | null,
  lng: number | undefined | null,
): lat is number {
  return isValidLatitude(lat) && isValidLongitude(lng)
}

export function normalizePolygon(raw: number[][] | null | undefined): LatLngPair[] | null {
  if (!raw || raw.length === 0) return null
  const points: LatLngPair[] = []
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue
    const lat = parseCoord(item[0])
    const lng = parseCoord(item[1])
    if (lat === undefined || lng === undefined || !isValidLatLng(lat, lng)) continue
    points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))])
  }
  return points.length >= 3 ? points : null
}

export function polygonCentroid(polygon: LatLngPair[]): LatLngPair {
  const n = polygon.length
  const lat = polygon.reduce((sum, p) => sum + p[0], 0) / n
  const lng = polygon.reduce((sum, p) => sum + p[1], 0) / n
  return [Number(lat.toFixed(6)), Number(lng.toFixed(6))]
}

/** Approximate area in hectares (equirectangular + shoelace). */
export function polygonAreaHa(polygon: LatLngPair[]): number {
  if (polygon.length < 3) return 0
  const meanLat = (polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length) * (Math.PI / 180)
  const mLat = 111_320
  const mLng = 111_320 * Math.max(Math.cos(meanLat), 1e-6)
  let area = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const [lat1, lng1] = polygon[i]
    const [lat2, lng2] = polygon[(i + 1) % polygon.length]
    const x1 = lng1 * mLng
    const y1 = lat1 * mLat
    const x2 = lng2 * mLng
    const y2 = lat2 * mLat
    area += x1 * y2 - x2 * y1
  }
  return Math.round((Math.abs(area) / 2 / 10_000) * 100) / 100
}

export function hasContour(polygon: number[][] | null | undefined): boolean {
  return Boolean(normalizePolygon(polygon))
}

export function formatCoord(value: number | undefined | null): string {
  if (!Number.isFinite(value ?? NaN)) return ''
  return String(value)
}
