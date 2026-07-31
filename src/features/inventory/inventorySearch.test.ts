import { describe, expect, it } from 'vitest'
import {
  filterInventoryBySearch,
  inventoryListQueryParams,
} from '@/features/inventory/inventorySearch'
import type { InventoryItem } from '@/types'

const wheat = {
  id: '1',
  name: 'Пшеница склад',
  category: 'harvest',
  unit: 'кг',
  currentStock: 10,
  minStock: 0,
  totalCapacity: 100,
  isActive: true,
  cropCode: 'wheat',
} as InventoryItem

const fuel = {
  ...wheat,
  id: '2',
  name: 'ДТ',
  category: 'fuel',
  cropCode: null,
} as InventoryItem

describe('inventorySearch', () => {
  it('builds query params with category + search', () => {
    expect(
      inventoryListQueryParams({ category: 'harvest', search: 'пшен', isActive: true }),
    ).toEqual({ is_active: true, category: 'harvest', search: 'пшен' })
  })

  it('omits empty search and all-category', () => {
    expect(inventoryListQueryParams({ category: 'all', search: '  ', isActive: true })).toEqual({
      is_active: true,
    })
  })

  it('filters harvest by crop name and fuel only by name', () => {
    const cropNames = { wheat: 'Пшеница' }
    expect(filterInventoryBySearch([wheat, fuel], 'пшен', cropNames)).toEqual([wheat])
    expect(filterInventoryBySearch([wheat, fuel], 'дт', cropNames)).toEqual([fuel])
    expect(filterInventoryBySearch([wheat, fuel], 'wheat', cropNames)).toEqual([wheat])
  })
})
