import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { InventoryQueueItem } from '@/types'

const apiRequest = vi.fn()
const inventoryUpdate = vi.fn()
const inventoryDelete = vi.fn()
const inventoryGet = vi.fn()
const inventoryPut = vi.fn()

vi.mock('@/lib/api', () => ({
  api: { request: (...args: unknown[]) => apiRequest(...args) },
}))

vi.mock('@/lib/db', () => ({
  db: {
    inventoryQueue: {
      update: (...args: unknown[]) => inventoryUpdate(...args),
      delete: (...args: unknown[]) => inventoryDelete(...args),
    },
    inventory: {
      get: (...args: unknown[]) => inventoryGet(...args),
      put: (...args: unknown[]) => inventoryPut(...args),
    },
  },
}))

describe('processInventoryQueueItem', () => {
  beforeEach(() => {
    vi.resetModules()
    apiRequest.mockReset()
    inventoryUpdate.mockReset()
    inventoryDelete.mockReset()
    inventoryGet.mockReset()
    inventoryPut.mockReset()
    inventoryGet.mockResolvedValue({
      id: 'item-1',
      name: 'ДТ',
      category: 'fuel',
      unit: 'л',
      currentStock: 50,
      minStock: 10,
      totalCapacity: 200,
      isActive: true,
    })
  })

  const baseItem: InventoryQueueItem = {
    id: 'q1',
    type: 'expense',
    itemId: 'item-1',
    payload: { item_id: 'item-1', type: 'expense', quantity: 10 },
    status: 'pending',
    createdAt: 1,
    updatedAt: 1,
    retries: 0,
    expectedStockAfter: 40,
  }

  it('marks synced (deletes) on success without drift', async () => {
    apiRequest.mockResolvedValue({
      status: 201,
      data: { stock_after: 40, id: 'op-server' },
    })
    const { processInventoryQueueItem } = await import('@/lib/inventorySyncProcess')
    const result = await processInventoryQueueItem(baseItem)
    expect(result).toBe('done')
    expect(inventoryDelete).toHaveBeenCalledWith('q1')
    expect(inventoryPut).toHaveBeenCalled()
  })

  it('marks conflict when server stock drifts', async () => {
    apiRequest.mockResolvedValue({
      status: 201,
      data: { stock_after: 25, id: 'op-server' },
    })
    const { processInventoryQueueItem } = await import('@/lib/inventorySyncProcess')
    const result = await processInventoryQueueItem(baseItem)
    expect(result).toBe('conflict')
    expect(inventoryUpdate).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({ status: 'conflict' }),
    )
  })

  it('marks conflict on insufficient stock 400', async () => {
    apiRequest.mockResolvedValue({
      status: 400,
      data: { detail: 'Недостаточно запасов: доступно 2, запрошено 10' },
    })
    const { processInventoryQueueItem } = await import('@/lib/inventorySyncProcess')
    const result = await processInventoryQueueItem(baseItem)
    expect(result).toBe('conflict')
    expect(inventoryUpdate).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({ status: 'conflict' }),
    )
  })

  it('marks error on other 400', async () => {
    apiRequest.mockResolvedValue({
      status: 400,
      data: { detail: 'Для корректировки укажите причину' },
    })
    const { processInventoryQueueItem } = await import('@/lib/inventorySyncProcess')
    const result = await processInventoryQueueItem(baseItem)
    expect(result).toBe('retry')
    expect(inventoryUpdate).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({ status: 'error' }),
    )
  })
})
