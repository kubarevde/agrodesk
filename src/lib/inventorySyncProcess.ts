import axios from 'axios'
import type { InventoryQueueItem } from '@/types'
import {
  isInventoryStockConflictDetail,
  isStockDrift,
} from '@/features/inventory/offlineInventory'
import { api } from './api'
import { db } from './db'

const SUCCESS_STATUSES = new Set([200, 201, 204])
const MAX_RETRIES = 5

function responseDetail(data: unknown): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    return String((data as { detail?: unknown }).detail ?? '')
  }
  return ''
}

async function applyServerStockHint(itemId: string, stockAfter: number): Promise<void> {
  const local = await db.inventory.get(itemId)
  if (!local) return
  await db.inventory.put({ ...local, currentStock: stockAfter })
}

/** Flush one pending inventory queue row. Exported for Vitest. */
export async function processInventoryQueueItem(
  item: InventoryQueueItem,
): Promise<'done' | 'retry' | 'conflict' | 'skip'> {
  try {
    const response = await api.request<Record<string, unknown>>({
      method: 'POST',
      url: '/api/inventory/operations',
      data: item.payload,
      headers: { 'X-Idempotency-Key': item.id },
      validateStatus: (status) => SUCCESS_STATUSES.has(status) || status < 500,
    })

    if (SUCCESS_STATUSES.has(response.status)) {
      const stockAfter = Number(response.data?.stock_after ?? NaN)
      if (Number.isFinite(stockAfter)) {
        await applyServerStockHint(item.itemId, stockAfter)
      }
      if (Number.isFinite(stockAfter) && isStockDrift(item.expectedStockAfter, stockAfter)) {
        await db.inventoryQueue.update(item.id, {
          status: 'conflict',
          lastError: `Остаток на сервере (${stockAfter}) отличается от ожидаемого (${item.expectedStockAfter}). Проверьте позицию.`,
          updatedAt: Date.now(),
        })
        return 'conflict'
      }
      await db.inventoryQueue.delete(item.id)
      return 'done'
    }

    const detail = responseDetail(response.data)
    if (response.status === 400 && isInventoryStockConflictDetail(detail)) {
      await db.inventoryQueue.update(item.id, {
        status: 'conflict',
        lastError: detail || 'Конфликт остатка на сервере',
        updatedAt: Date.now(),
        retries: (item.retries ?? 0) + 1,
      })
      return 'conflict'
    }

    if (response.status === 400 || response.status === 404) {
      await db.inventoryQueue.update(item.id, {
        status: 'error',
        lastError: detail || `Ошибка ${response.status}`,
        updatedAt: Date.now(),
        retries: (item.retries ?? 0) + 1,
      })
      return 'retry'
    }

    return 'skip'
  } catch (error) {
    const retries = (item.retries ?? 0) + 1
    const detail =
      axios.isAxiosError(error) && error.response?.data
        ? responseDetail(error.response.data)
        : ''
    if (detail && isInventoryStockConflictDetail(detail)) {
      await db.inventoryQueue.update(item.id, {
        status: 'conflict',
        lastError: detail,
        updatedAt: Date.now(),
        retries,
      })
      return 'conflict'
    }
    await db.inventoryQueue.update(item.id, {
      status: retries > MAX_RETRIES ? 'error' : 'pending',
      lastError: detail || (error instanceof Error ? error.message : 'network'),
      updatedAt: Date.now(),
      retries,
    })
    return 'retry'
  }
}
