import { describe, expect, it } from 'vitest'
import { fieldsContainingEquipment } from './fieldsContainingEquipment'
import type { FieldResponse } from '@/features/fields/types'
import type { EquipmentDetail } from '@/features/equipment/types'

function field(partial: Partial<FieldResponse> & Pick<FieldResponse, 'id' | 'name'>): FieldResponse {
  return {
    crop_type: null,
    crop_code: null,
    area_ha: null,
    soil_type: null,
    description: null,
    latitude: null,
    longitude: null,
    polygon: null,
    sharing_status: null,
    is_active: true,
    ...partial,
  }
}

function equipment(
  partial: Partial<EquipmentDetail> & Pick<EquipmentDetail, 'id' | 'name'>,
): EquipmentDetail {
  return {
    type: null,
    year_of_manufacture: null,
    serial_number: null,
    meter_type: 'motohours',
    current_meter: 0,
    to_interval: null,
    next_to_at: null,
    latitude: null,
    longitude: null,
    image_url: null,
    is_active: true,
    to_status: 'ok',
    meter_label: 'м/ч',
    ...partial,
  }
}

describe('fieldsContainingEquipment', () => {
  it('returns only fields whose contour covers equipment', () => {
    const fields = [
      field({
        id: 'f1',
        name: 'A',
        polygon: [
          [51.0, 36.0],
          [51.0, 36.2],
          [51.2, 36.2],
          [51.2, 36.0],
        ],
      }),
      field({
        id: 'f2',
        name: 'B',
        polygon: [
          [52.0, 37.0],
          [52.0, 37.2],
          [52.2, 37.2],
          [52.2, 37.0],
        ],
      }),
    ]
    const items = [
      equipment({ id: 'e1', name: 'T', latitude: 51.1, longitude: 36.1 }),
    ]
    expect(fieldsContainingEquipment(fields, items).map((f) => f.id)).toEqual(['f1'])
  })
})
