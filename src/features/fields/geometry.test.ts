import { describe, expect, it } from 'vitest'
import {
  hasContour,
  isValidLatLng,
  normalizePolygon,
  parseCoord,
  polygonAreaHa,
  polygonCentroid,
} from './geometry'

describe('field geometry', () => {
  it('rejects rings with fewer than 3 points', () => {
    expect(normalizePolygon([[51, 36], [51.1, 36]])).toBeNull()
  })

  it('computes centroid and positive area', () => {
    const poly = normalizePolygon([
      [51.5, 36.5],
      [51.5, 36.52],
      [51.52, 36.51],
    ])
    expect(poly).not.toBeNull()
    if (!poly) return
    const [lat, lng] = polygonCentroid(poly)
    expect(lat).toBeGreaterThan(51.4)
    expect(lng).toBeGreaterThan(36.4)
    expect(polygonAreaHa(poly)).toBeGreaterThan(0)
    expect(hasContour(poly)).toBe(true)
  })

  it('parses coords without producing NaN', () => {
    expect(parseCoord('')).toBeUndefined()
    expect(parseCoord('   ')).toBeUndefined()
    expect(parseCoord('5')).toBe(5)
    expect(parseCoord('55,123')).toBe(55.123)
    expect(parseCoord('36.5')).toBe(36.5)
    expect(parseCoord('-')).toBeUndefined()
    expect(parseCoord(Number.NaN)).toBeUndefined()
    expect(isValidLatLng(5, Number.NaN)).toBe(false)
    expect(isValidLatLng(5, undefined)).toBe(false)
    expect(isValidLatLng(51.5, 36.5)).toBe(true)
  })
})
