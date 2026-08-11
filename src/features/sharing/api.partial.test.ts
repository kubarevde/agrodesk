import { describe, expect, it } from 'vitest'
import { listingCreateToApi } from './api'

describe('listingCreateToApi partial field', () => {
  it('sends sharing_scope and shared_polygon for partial_field', () => {
    const body = listingCreateToApi({
      type: 'field',
      title: 'Аренда: участок',
      fieldId: '11111111-1111-1111-1111-111111111111',
      sharingScope: 'partial_field',
      sharedPolygon: [
        [51.73, 36.19],
        [51.73, 36.191],
        [51.731, 36.191],
      ],
    })
    expect(body.sharing_scope).toBe('partial_field')
    expect(body.shared_polygon).toEqual([
      [51.73, 36.19],
      [51.73, 36.191],
      [51.731, 36.191],
    ])
  })

  it('clears shared_polygon for full_field', () => {
    const body = listingCreateToApi({
      type: 'field',
      title: 'Аренда: поле',
      fieldId: '11111111-1111-1111-1111-111111111111',
      sharingScope: 'full_field',
      sharedPolygon: [
        [51.73, 36.19],
        [51.73, 36.191],
        [51.731, 36.191],
      ],
    })
    expect(body.sharing_scope).toBe('full_field')
    expect(body.shared_polygon).toBeNull()
  })
})
