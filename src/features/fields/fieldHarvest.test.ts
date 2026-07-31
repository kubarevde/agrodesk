import { describe, expect, it } from 'vitest'
import {
  aggregateHarvestIncomeByFieldYear,
  fieldEffectiveCropCode,
  fieldHarvestBlockReason,
  harvestItemsMatchingCrop,
} from '@/features/fields/fieldHarvest'
import type { InventoryItem } from '@/types'

const wheatItem = {
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

const fuelItem = {
  ...wheatItem,
  id: '2',
  category: 'fuel',
  cropCode: null,
} as InventoryItem

const crops = [{ code: 'wheat', name: 'Пшеница' }]

describe('fieldHarvest helpers', () => {
  it('blocks when field has no culture at all', () => {
    expect(
      fieldHarvestBlockReason({ crop_code: null, crop_type: null }, [wheatItem], crops),
    ).toMatch(/не задана культура/i)
  })

  it('resolves crop_code from crop_type via dictionary', () => {
    expect(
      fieldEffectiveCropCode({ crop_code: null, crop_type: 'Пшеница' }, crops),
    ).toBe('wheat')
  })

  it('blocks when culture label cannot be resolved to a code', () => {
    expect(
      fieldHarvestBlockReason(
        { crop_code: null, crop_type: 'Неизвестная' },
        [wheatItem],
        crops,
      ),
    ).toMatch(/справочник/i)
  })

  it('blocks when no matching harvest SKU', () => {
    expect(
      fieldHarvestBlockReason({ crop_code: 'wheat', crop_type: 'Пшеница' }, [], crops),
    ).toMatch(/пшениц/i)
  })

  it('allows when crop and SKU match', () => {
    expect(
      fieldHarvestBlockReason({ crop_code: 'wheat', crop_type: 'Пшеница' }, [wheatItem], crops),
    ).toBeNull()
  })

  it('filters harvest items by crop_code case-insensitively', () => {
    expect(harvestItemsMatchingCrop([wheatItem, fuelItem], 'Wheat')).toEqual([wheatItem])
    expect(harvestItemsMatchingCrop([wheatItem, fuelItem], null)).toEqual([])
  })

  it('aggregates harvest_income by field and year', () => {
    const rows = aggregateHarvestIncomeByFieldYear([
      {
        type: 'income',
        purpose: 'harvest_income',
        fieldId: 'f1',
        fieldName: 'Поле А',
        date: '01.07.2026',
        quantity: 100,
      },
      {
        type: 'income',
        purpose: 'harvest_income',
        fieldId: 'f1',
        fieldName: 'Поле А',
        date: '15.08.2026',
        quantity: 50,
      },
      {
        type: 'income',
        purpose: 'general',
        fieldId: 'f1',
        fieldName: 'Поле А',
        date: '01.07.2026',
        quantity: 999,
      },
    ])
    expect(rows).toEqual([
      { fieldId: 'f1', fieldName: 'Поле А', year: 2026, quantity: 150 },
    ])
  })
})
