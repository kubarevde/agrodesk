import { describe, expect, it } from 'vitest'
import {
  polygonsOverlap,
  validatePlantingContour,
} from './plantingContourValidation'

const field = [
  [51.0, 36.0],
  [51.0, 36.2],
  [51.2, 36.2],
  [51.2, 36.0],
]

describe('plantingContourValidation', () => {
  it('allows edge-touching siblings', () => {
    const left = [
      [51.05, 36.05],
      [51.05, 36.1],
      [51.1, 36.1],
      [51.1, 36.05],
    ]
    const right = [
      [51.05, 36.1],
      [51.05, 36.15],
      [51.1, 36.15],
      [51.1, 36.1],
    ]
    expect(polygonsOverlap(left, right)).toBe(false)
    expect(
      validatePlantingContour({
        fieldPolygon: field,
        plantingPolygon: right,
        siblings: [{ id: '1', label: 'Пшеница', polygon: left }],
        occupiesWholeField: false,
      }),
    ).toBeNull()
  })

  it('blocks outside and overlapping contours', () => {
    const outside = [
      [51.05, 36.05],
      [51.05, 36.3],
      [51.1, 36.3],
      [51.1, 36.05],
    ]
    expect(
      validatePlantingContour({
        fieldPolygon: field,
        plantingPolygon: outside,
        siblings: [],
        occupiesWholeField: false,
      })?.code,
    ).toBe('outside_field')

    const a = [
      [51.05, 36.05],
      [51.05, 36.1],
      [51.1, 36.1],
      [51.1, 36.05],
    ]
    const b = [
      [51.07, 36.07],
      [51.07, 36.12],
      [51.12, 36.12],
      [51.12, 36.07],
    ]
    expect(
      validatePlantingContour({
        fieldPolygon: field,
        plantingPolygon: b,
        siblings: [{ id: '1', label: 'Ячмень', polygon: a }],
        occupiesWholeField: false,
      })?.code,
    ).toBe('overlap')
  })

  it('blocks whole-field when siblings exist', () => {
    expect(
      validatePlantingContour({
        fieldPolygon: field,
        plantingPolygon: null,
        siblings: [{ id: '1', label: 'Пшеница', polygon: null }],
        occupiesWholeField: true,
      })?.code,
    ).toBe('whole_field_blocked')
  })
})
