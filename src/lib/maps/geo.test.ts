import { describe, expect, it } from 'vitest'
import {
  filterRingsContainingAnyPoint,
  pointInPolygon,
} from './geo'

const square: number[][] = [
  [51.0, 36.0],
  [51.0, 36.2],
  [51.2, 36.2],
  [51.2, 36.0],
]

describe('pointInPolygon', () => {
  it('detects interior and exterior points', () => {
    expect(pointInPolygon(51.1, 36.1, square)).toBe(true)
    expect(pointInPolygon(50.0, 36.1, square)).toBe(false)
    expect(pointInPolygon(51.1, 37.0, square)).toBe(false)
  })

  it('treats boundary points as inside', () => {
    expect(pointInPolygon(51.0, 36.1, square)).toBe(true)
    expect(pointInPolygon(51.1, 36.0, square)).toBe(true)
  })

  it('rejects invalid input', () => {
    expect(pointInPolygon(Number.NaN, 36, square)).toBe(false)
    expect(pointInPolygon(51, 36, [[51, 36], [51.1, 36]])).toBe(false)
  })
})

describe('filterRingsContainingAnyPoint', () => {
  it('keeps only rings that cover a point', () => {
    const fields = [
      { id: 'a', polygon: square },
      { id: 'b', polygon: [[52, 37], [52, 37.1], [52.1, 37.1]] as number[][] },
    ]
    const matched = filterRingsContainingAnyPoint(
      fields,
      [{ lat: 51.1, lng: 36.1 }],
      (f) => f.polygon,
    )
    expect(matched.map((f) => f.id)).toEqual(['a'])
  })
})
