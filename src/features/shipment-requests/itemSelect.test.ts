import { describe, expect, it } from 'vitest'
import type { InventoryItem } from '@/types'
import {
  categoryColumnLabel,
  selectableInventoryItemsForRequest,
  shipmentRequestItemOptionLabel,
} from './itemSelect'

const base = {
  unit: 'кг',
  currentStock: 10,
  minStock: 0,
  totalCapacity: 100,
  isActive: true,
} as const

const harvest = {
  id: 'h1',
  name: 'Пшеница склад',
  category: 'harvest',
  isHarvest: true,
  cropCode: 'wheat',
  ...base,
} as InventoryItem

const fuel = {
  id: 'f1',
  name: 'ДТ',
  category: 'fuel',
  isHarvest: false,
  ...base,
  unit: 'л',
} as InventoryItem

const inactive = { ...harvest, id: 'x', isActive: false } as InventoryItem

describe('shipment request item select', () => {
  it('includes harvest SKUs among selectable items', () => {
    const list = selectableInventoryItemsForRequest([harvest, fuel, inactive])
    expect(list.map((i) => i.id)).toEqual(['h1', 'f1'])
    expect(list.some((i) => i.category === 'harvest')).toBe(true)
  })

  it('labels harvest with category in option text', () => {
    expect(shipmentRequestItemOptionLabel(harvest)).toMatch(/урожай/i)
    expect(shipmentRequestItemOptionLabel(fuel)).toMatch(/топливо/i)
  })

  it('category column shows harvest section', () => {
    expect(categoryColumnLabel('harvest', true)).toContain('Урожай')
    expect(categoryColumnLabel('fuel')).toMatch(/топливо/i)
  })
})
