import { describe, expect, it } from 'vitest'
import { getInventoryOperationLabel } from './utils'

describe('getInventoryOperationLabel', () => {
  it('labels adjustments and ordinary ops in Russian', () => {
    expect(getInventoryOperationLabel({ type: 'income', purpose: 'adjustment' })).toBe(
      'Корректировка (+)',
    )
    expect(getInventoryOperationLabel({ type: 'expense', purpose: 'adjustment' })).toBe(
      'Корректировка (−)',
    )
    expect(getInventoryOperationLabel({ type: 'income', purpose: 'opening' })).toBe(
      'Начальный остаток',
    )
    expect(getInventoryOperationLabel({ type: 'income' })).toBe('Приход')
    expect(getInventoryOperationLabel({ type: 'expense', purpose: 'general' })).toBe('Расход')
    expect(getInventoryOperationLabel({ type: 'expense', purpose: 'refuel' })).toBe('Заправка')
  })
})
