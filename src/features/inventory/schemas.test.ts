import { describe, expect, it } from 'vitest'
import { inventoryItemSchema } from '@/features/inventory/schemas'

const base = {
  name: 'Пшеница склад',
  unit: 'кг',
  currentStock: 100,
  minStock: 10,
  totalCapacity: 1000,
  isActive: true,
}

describe('inventoryItemSchema harvest cropCode', () => {
  it('requires cropCode when category is harvest', () => {
    const result = inventoryItemSchema.safeParse({
      ...base,
      category: 'harvest',
      cropCode: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('cropCode'))).toBe(true)
    }
  })

  it('rejects sentinel none for harvest', () => {
    const result = inventoryItemSchema.safeParse({
      ...base,
      category: 'harvest',
      cropCode: 'none',
    })
    expect(result.success).toBe(false)
  })

  it('accepts harvest with crop code', () => {
    const result = inventoryItemSchema.safeParse({
      ...base,
      category: 'harvest',
      cropCode: 'wheat',
    })
    expect(result.success).toBe(true)
  })

  it('allows empty cropCode for non-harvest', () => {
    const result = inventoryItemSchema.safeParse({
      ...base,
      category: 'fuel',
      unit: 'л',
      cropCode: '',
    })
    expect(result.success).toBe(true)
  })
})
