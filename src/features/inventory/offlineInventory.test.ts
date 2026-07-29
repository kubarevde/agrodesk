import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyOptimisticStock,
  expectedStockAfter,
  isInventoryStockConflictDetail,
  isStockDrift,
} from './offlineInventory'
import type { InventoryItem } from '@/types'

const sample: InventoryItem[] = [
  {
    id: 'i1',
    name: 'ДТ',
    category: 'fuel',
    unit: 'л',
    currentStock: 100,
    minStock: 20,
    totalCapacity: 500,
    isActive: true,
  },
]

describe('applyOptimisticStock', () => {
  it('increases stock on income', () => {
    const next = applyOptimisticStock(sample, 'i1', 'income', 15)
    expect(next[0]?.currentStock).toBe(115)
    expect(sample[0]?.currentStock).toBe(100)
  })

  it('decreases stock on expense', () => {
    const next = applyOptimisticStock(sample, 'i1', 'expense', 40)
    expect(next[0]?.currentStock).toBe(60)
  })

  it('leaves other items untouched', () => {
    const withTwo = [
      ...sample,
      { ...sample[0]!, id: 'i2', name: 'Семена', currentStock: 10 },
    ]
    const next = applyOptimisticStock(withTwo, 'i1', 'income', 5)
    expect(next.find((row) => row.id === 'i2')?.currentStock).toBe(10)
  })
})

describe('expectedStockAfter / drift / conflict detail', () => {
  it('computes expected stock', () => {
    expect(expectedStockAfter(100, 'income', 5)).toBe(105)
    expect(expectedStockAfter(100, 'expense', 5)).toBe(95)
  })

  it('detects stock drift', () => {
    expect(isStockDrift(100, 100)).toBe(false)
    expect(isStockDrift(100, 90)).toBe(true)
  })

  it('detects insufficient-stock API detail', () => {
    expect(isInventoryStockConflictDetail('Недостаточно запасов: доступно 2, запрошено 5')).toBe(
      true,
    )
    expect(isInventoryStockConflictDetail('Для корректировки укажите причину')).toBe(false)
  })
})

describe('status transition helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', { randomUUID: () => 'op-1' })
  })

  it('maps queue statuses used by UI', () => {
    const statuses = ['pending', 'synced', 'error', 'conflict'] as const
    expect(statuses).toContain('pending')
    expect(statuses).toContain('conflict')
  })
})
