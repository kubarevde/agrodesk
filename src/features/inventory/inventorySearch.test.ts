import { describe, expect, it } from 'vitest'
import {
  filterInventoryBySearch,
  filterInventoryByStatus,
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

const archivedPart = {
  ...wheat,
  id: '3',
  name: 'Архивная деталь',
  category: 'parts',
  isActive: false,
  cropCode: null,
} as InventoryItem

describe('inventorySearch', () => {
  it('builds query params with category + search', () => {
    expect(
      inventoryListQueryParams({ category: 'harvest', search: 'пшен', isActive: true }),
    ).toEqual({ is_active: true, category: 'harvest', search: 'пшен' })
  })

  it('prefers status over legacy isActive', () => {
    expect(inventoryListQueryParams({ status: 'archived' })).toEqual({ status: 'archived' })
    expect(inventoryListQueryParams({ status: 'all', category: 'fuel' })).toEqual({
      status: 'all',
      category: 'fuel',
    })
  })

  it('omits empty search and all-category', () => {
    expect(inventoryListQueryParams({ category: 'all', search: '  ', isActive: true })).toEqual({
      is_active: true,
    })
  })

  it('filters by active / archived / all', () => {
    const rows = [wheat, archivedPart, fuel]
    expect(filterInventoryByStatus(rows, 'active')).toEqual([wheat, fuel])
    expect(filterInventoryByStatus(rows, 'archived')).toEqual([archivedPart])
    expect(filterInventoryByStatus(rows, 'all')).toEqual(rows)
  })

  it('filters harvest by crop name and fuel only by name', () => {
    const cropNames = { wheat: 'Пшеница' }
    expect(filterInventoryBySearch([wheat, fuel], 'пшен', cropNames)).toEqual([wheat])
    expect(filterInventoryBySearch([wheat, fuel], 'дт', cropNames)).toEqual([fuel])
    expect(filterInventoryBySearch([wheat, fuel], 'wheat', cropNames)).toEqual([wheat])
  })
})
