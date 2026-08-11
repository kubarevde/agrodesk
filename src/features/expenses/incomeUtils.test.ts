import { describe, expect, it } from 'vitest'
import type { ManualIncome, Shipment, TmcShipment } from '@/types'
import {
  buildIncomeLedger,
  sumIncomeLedger,
  groupIncomeByCategory,
  getIncomeCategoryColor,
  matchesIncomeCategoryFilter,
} from './incomeUtils'

const harvest = (partial: Partial<Shipment>): Shipment => ({
  id: 'h1',
  date: '01.08.2026',
  cropType: 'Пшеница',
  quantityKg: 10,
  pricePerKg: 100,
  totalSum: 1000,
  ...partial,
})

const tmc = (partial: Partial<TmcShipment>): TmcShipment => ({
  id: 't1',
  date: '02.08.2026',
  inventoryItemId: 'i1',
  itemName: 'Дизель',
  category: 'fuel',
  unit: 'л',
  quantity: 5,
  pricePerUnit: 50,
  totalSum: 250,
  ...partial,
})

const manual = (partial: Partial<ManualIncome>): ManualIncome => ({
  id: 'm1',
  date: '03.08.2026',
  category: 'services',
  amount: 500,
  description: 'Услуга',
  ...partial,
})

describe('incomeUtils ledger', () => {
  it('aggregates sources without duplicating and skips zero totals', () => {
    const ledger = buildIncomeLedger({
      harvest: [harvest({}), harvest({ id: 'h0', totalSum: 0 })],
      tmc: [tmc({})],
      manual: [manual({})],
    })
    expect(ledger).toHaveLength(3)
    expect(sumIncomeLedger(ledger)).toBe(1750)
    expect(groupIncomeByCategory(ledger).map((g) => g.key).sort()).toEqual([
      'harvest_shipment',
      'services',
      'tmc_shipment',
    ])
  })

  it('filters by dictionary category and auto shipment sources', () => {
    const ledger = buildIncomeLedger({
      harvest: [harvest({})],
      tmc: [tmc({})],
      manual: [manual({})],
    })
    expect(ledger.filter((row) => matchesIncomeCategoryFilter(row, undefined))).toHaveLength(3)
    expect(
      ledger.filter((row) => matchesIncomeCategoryFilter(row, 'harvest_shipment')),
    ).toEqual([expect.objectContaining({ source: 'harvest_shipment' })])
    expect(ledger.filter((row) => matchesIncomeCategoryFilter(row, 'tmc_shipment'))).toEqual([
      expect.objectContaining({ source: 'tmc_shipment' }),
    ])
    expect(ledger.filter((row) => matchesIncomeCategoryFilter(row, 'services'))).toEqual([
      expect.objectContaining({ source: 'manual', title: 'services' }),
    ])
  })

  it('assigns distinct colors for known income categories', () => {
    const colors = [
      getIncomeCategoryColor('harvest_shipment'),
      getIncomeCategoryColor('tmc_shipment'),
      getIncomeCategoryColor('services'),
      getIncomeCategoryColor('sharing'),
    ]
    expect(new Set(colors).size).toBe(4)
  })
})
