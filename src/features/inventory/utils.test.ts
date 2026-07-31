import { describe, expect, it } from 'vitest'
import { getCategoryLabel, getInventoryOperationLabel, isHarvestCategory } from './utils'

describe('inventory category helpers', () => {
  it('recognizes harvest category case-insensitively', () => {
    expect(isHarvestCategory('harvest')).toBe(true)
    expect(isHarvestCategory('Harvest')).toBe(true)
    expect(isHarvestCategory('fuel')).toBe(false)
    expect(isHarvestCategory(null)).toBe(false)
  })

  it('labels harvest category for offline fallback', () => {
    expect(getCategoryLabel('harvest')).toContain('Урожай')
  })

  it('labels harvest income with field name', () => {
    expect(
      getInventoryOperationLabel({
        type: 'income',
        purpose: 'harvest_income',
        fieldName: 'Север',
      }),
    ).toBe('Сбор с поля Север')
  })
})
