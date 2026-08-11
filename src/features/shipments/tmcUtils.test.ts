import { describe, expect, it } from 'vitest'
import type { TmcShipment } from '@/types'
import { formatTmcShippedTotal, groupTmcShipmentsByItem, sumTmcRevenue } from './tmcUtils'

function row(partial: Partial<TmcShipment>): TmcShipment {
  return {
    id: '1',
    date: '01.07.2026',
    inventoryItemId: 'i1',
    itemName: 'ДТ',
    category: 'fuel',
    unit: 'л',
    quantity: 100,
    pricePerUnit: 50,
    totalSum: 5000,
    ...partial,
  }
}

describe('tmcUtils', () => {
  it('formats multi-unit shipped total', () => {
    const label = formatTmcShippedTotal([
      row({ id: 'a', unit: 'л', quantity: 100 }),
      row({ id: 'b', itemName: 'Семена', unit: 'кг', quantity: 20, totalSum: 200 }),
    ])
    expect(label).toContain('л')
    expect(label).toContain('кг')
    expect(label).toContain('·')
  })

  it('sums revenue and groups by item', () => {
    const rows = [
      row({ id: 'a', quantity: 10, totalSum: 100 }),
      row({ id: 'b', quantity: 5, totalSum: 50 }),
    ]
    expect(sumTmcRevenue(rows)).toBe(150)
    expect(groupTmcShipmentsByItem(rows)[0]?.quantity).toBe(15)
  })
})
