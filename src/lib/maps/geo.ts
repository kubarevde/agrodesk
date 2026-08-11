/** Shared geo helpers for map overlays. Rings use Leaflet order: [lat, lng]. */

export type LatLngPair = [number, number]

/**
 * Ray-casting point-in-polygon. Boundary points count as inside.
 * Coordinates: lat/lng WGS84; ring is [[lat, lng], …].
 */
export function pointInPolygon(
  lat: number,
  lng: number,
  ring: ReadonlyArray<ReadonlyArray<number>>,
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || ring.length < 3) return false

  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i]?.[0]
    const xi = ring[i]?.[1]
    const yj = ring[j]?.[0]
    const xj = ring[j]?.[1]
    if (
      yi == null ||
      xi == null ||
      yj == null ||
      xj == null ||
      !Number.isFinite(yi) ||
      !Number.isFinite(xi) ||
      !Number.isFinite(yj) ||
      !Number.isFinite(xj)
    ) {
      continue
    }

    // On edge (within float tolerance)
    if (pointOnSegment(lat, lng, yi, xi, yj, xj)) return true

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointOnSegment(
  lat: number,
  lng: number,
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): boolean {
  const cross = (lng - lng1) * (lat2 - lat1) - (lat - lat1) * (lng2 - lng1)
  if (Math.abs(cross) > 1e-10) return false
  const dot = (lng - lng1) * (lng2 - lng1) + (lat - lat1) * (lat2 - lat1)
  if (dot < 0) return false
  const lenSq = (lng2 - lng1) ** 2 + (lat2 - lat1) ** 2
  return dot <= lenSq
}

export function filterRingsContainingPoint<T>(
  items: T[],
  lat: number,
  lng: number,
  getRing: (item: T) => ReadonlyArray<ReadonlyArray<number>> | null | undefined,
): T[] {
  return items.filter((item) => {
    const ring = getRing(item)
    return ring != null && ring.length >= 3 && pointInPolygon(lat, lng, ring)
  })
}

/** Keep items whose ring contains at least one of the points. */
export function filterRingsContainingAnyPoint<T>(
  items: T[],
  points: ReadonlyArray<{ lat: number; lng: number }>,
  getRing: (item: T) => ReadonlyArray<ReadonlyArray<number>> | null | undefined,
): T[] {
  if (points.length === 0) return []
  return items.filter((item) => {
    const ring = getRing(item)
    if (ring == null || ring.length < 3) return false
    return points.some((p) => pointInPolygon(p.lat, p.lng, ring))
  })
}

function sampleEdgePoints(
  ring: ReadonlyArray<ReadonlyArray<number>>,
  samplesPerEdge = 4,
): Array<[number, number]> {
  const points: Array<[number, number]> = []
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    if (!a || !b || a.length < 2 || b.length < 2) continue
    points.push([a[0], a[1]])
    for (let step = 1; step < samplesPerEdge; step += 1) {
      const t = step / samplesPerEdge
      points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return points
}

/** True when inner ring lies inside outer (vertices + edge samples). */
export function polygonContainsPolygon(
  outer: ReadonlyArray<ReadonlyArray<number>>,
  inner: ReadonlyArray<ReadonlyArray<number>>,
): boolean {
  if (outer.length < 3 || inner.length < 3) return false
  return sampleEdgePoints(inner).every(([lat, lng]) => pointInPolygon(lat, lng, outer))
}
