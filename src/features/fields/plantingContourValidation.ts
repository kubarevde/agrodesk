/** Client-side planting contour checks (mirror backend field_geometry). */

import {
  normalizePolygon,
  polygonAreaHa,
  type LatLngPair,
} from './geometry'
import { polygonContainsPolygon } from '@/lib/maps/geo'

/** Same order of magnitude as backend POLYGON_OVERLAP_EPSILON_HA (1 m²). */
export const POLYGON_OVERLAP_EPSILON_HA = 1e-4

function projectRing(
  ring: LatLngPair[],
  meanLat: number,
): Array<[number, number]> {
  const mLat = 111_320
  const mLng = 111_320 * Math.max(Math.cos((meanLat * Math.PI) / 180), 1e-6)
  return ring.map(([lat, lng]) => [lng * mLng, lat * mLat])
}

function signedArea(xy: Array<[number, number]>): number {
  let area = 0
  for (let i = 0; i < xy.length; i += 1) {
    const [x1, y1] = xy[i]
    const [x2, y2] = xy[(i + 1) % xy.length]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

function clipEdge(
  subject: Array<[number, number]>,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Array<[number, number]> {
  if (subject.length === 0) return []
  const out: Array<[number, number]> = []
  const dx = x2 - x1
  const dy = y2 - y1
  const inside = (p: [number, number]) => dx * (p[1] - y1) - dy * (p[0] - x1) >= -1e-9
  const intersect = (p: [number, number], q: [number, number]): [number, number] => {
    const [x3, y3] = p
    const [x4, y4] = q
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(den) < 1e-18) return q
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
  }
  let prev = subject[subject.length - 1]
  let prevIn = inside(prev)
  for (const cur of subject) {
    const curIn = inside(cur)
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur))
      out.push(cur)
    } else if (prevIn) {
      out.push(intersect(prev, cur))
    }
    prev = cur
    prevIn = curIn
  }
  return out
}

function clipPolygon(
  subject: Array<[number, number]>,
  clip: Array<[number, number]>,
): Array<[number, number]> {
  let output = subject.slice()
  for (let i = 0; i < clip.length; i += 1) {
    if (output.length === 0) return []
    const [x1, y1] = clip[i]
    const [x2, y2] = clip[(i + 1) % clip.length]
    output = clipEdge(output, x1, y1, x2, y2)
  }
  return output
}

export function polygonIntersectionAreaHa(
  a: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<ReadonlyArray<number>>,
): number {
  const na = normalizePolygon(a as number[][])
  const nb = normalizePolygon(b as number[][])
  if (!na || !nb) return 0
  const meanLat =
    (na.reduce((s, p) => s + p[0], 0) + nb.reduce((s, p) => s + p[0], 0)) /
    (na.length + nb.length)
  let ax = projectRing(na, meanLat)
  let bx = projectRing(nb, meanLat)
  if (signedArea(bx) < 0) bx = bx.slice().reverse()
  if (signedArea(ax) < 0) ax = ax.slice().reverse()
  const clipped = clipPolygon(ax, bx)
  if (clipped.length < 3) return 0
  return Math.round((Math.abs(signedArea(clipped)) / 10_000) * 1e6) / 1e6
}

export function polygonsOverlap(
  a: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<ReadonlyArray<number>>,
  epsilonHa = POLYGON_OVERLAP_EPSILON_HA,
): boolean {
  return polygonIntersectionAreaHa(a, b) > epsilonHa
}

export type PlantingContourError =
  | 'invalid'
  | 'outside_field'
  | 'overlap'
  | 'whole_field_blocked'

export function plantingContourErrorMessage(
  code: PlantingContourError,
  overlapLabel?: string,
): string {
  switch (code) {
    case 'invalid':
      return 'Контур культуры имеет некорректную геометрию'
    case 'outside_field':
      return 'Контур культуры выходит за границы выбранного поля'
    case 'overlap':
      return overlapLabel
        ? `Контур культуры пересекается с контуром культуры «${overlapLabel}»`
        : 'Контур культуры пересекается с другой культурой на поле'
    case 'whole_field_blocked':
      return 'Нельзя занять всё поле: часть площади уже занята другими культурами/посевами'
  }
}

type SiblingContour = {
  id: string
  label: string
  polygon: number[][] | null
}

/** Client pre-check before save. Returns null when OK. */
export function validatePlantingContour(options: {
  fieldPolygon: number[][] | null | undefined
  plantingPolygon: number[][] | null
  siblings: SiblingContour[]
  occupiesWholeField: boolean
}): { code: PlantingContourError; message: string } | null {
  const fieldRing = normalizePolygon(options.fieldPolygon)
  if (options.occupiesWholeField) {
    if (!fieldRing) {
      return {
        code: 'invalid',
        message: 'Нельзя занять всё поле: у поля нет корректного контура',
      }
    }
    if (options.siblings.length > 0) {
      return {
        code: 'whole_field_blocked',
        message: plantingContourErrorMessage('whole_field_blocked'),
      }
    }
    return null
  }

  const planting = normalizePolygon(options.plantingPolygon)
  if (!planting) return null // contour optional

  if (polygonAreaHa(planting) <= 0) {
    return { code: 'invalid', message: plantingContourErrorMessage('invalid') }
  }
  if (!fieldRing || !polygonContainsPolygon(fieldRing, planting)) {
    return {
      code: 'outside_field',
      message: plantingContourErrorMessage('outside_field'),
    }
  }
  for (const sibling of options.siblings) {
    const other = normalizePolygon(sibling.polygon)
    if (!other) continue
    if (polygonsOverlap(planting, other)) {
      return {
        code: 'overlap',
        message: plantingContourErrorMessage('overlap', sibling.label),
      }
    }
  }
  return null
}
