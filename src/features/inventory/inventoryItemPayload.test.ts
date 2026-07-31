import { describe, expect, it } from 'vitest'
import {
  asCropCode,
  buildInventoryItemUpdateBody,
  inventoryCropPayload,
} from '@/features/inventory/inventoryItemPayload'

describe('inventoryItemPayload', () => {
  it('asCropCode reads string or { value }', () => {
    expect(asCropCode('wheat')).toBe('wheat')
    expect(asCropCode({ value: 'barley', label: 'Ячмень' })).toBe('barley')
    expect(asCropCode(null)).toBe('')
    expect(asCropCode(undefined)).toBe('')
  })

  it('requires crop for harvest and clears for other categories', () => {
    expect(inventoryCropPayload('harvest', 'wheat')).toBe('wheat')
    expect(inventoryCropPayload('harvest', { value: 'wheat' })).toBe('wheat')
    expect(inventoryCropPayload('harvest', 'none')).toBeNull()
    expect(inventoryCropPayload('harvest', '')).toBeNull()
    expect(inventoryCropPayload('fuel', 'wheat')).toBeNull()
  })

  it('buildInventoryItemUpdateBody sends crop_code for harvest', () => {
    expect(
      buildInventoryItemUpdateBody({
        name: 'SKU',
        category: 'harvest',
        unit: 'кг',
        minStock: 1,
        totalCapacity: 10,
        isActive: true,
        cropCode: 'wheat',
      }),
    ).toEqual({
      name: 'SKU',
      category: 'harvest',
      unit: 'кг',
      min_stock: 1,
      total_capacity: 10,
      is_active: true,
      crop_code: 'wheat',
    })
  })

  it('buildInventoryItemUpdateBody clears crop for non-harvest', () => {
    expect(
      buildInventoryItemUpdateBody({
        category: 'fuel',
        cropCode: 'wheat',
      }),
    ).toMatchObject({ category: 'fuel', crop_code: null })
  })

  it('buildInventoryItemUpdateBody rejects harvest without crop', () => {
    expect(() =>
      buildInventoryItemUpdateBody({
        category: 'harvest',
        cropCode: '',
      }),
    ).toThrow(/культур/i)
  })
})
