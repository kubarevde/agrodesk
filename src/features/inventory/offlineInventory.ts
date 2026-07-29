import type { InventoryItem, InventoryQueueItem } from '@/types'
import { db } from '@/lib/db'
import { inventoryOperationToApi } from '@/lib/transformers'

export type InventoryOpKind = 'income' | 'expense' | 'adjustment'

export type InventoryOfflinePayload = {
  itemId: string
  type: 'income' | 'expense'
  quantity: number
  reason?: string
  supplier?: string
  cost?: number
  date?: string
  purpose?: string
  /** UI kind for queue row (adjustment vs plain income/expense). */
  queueType: InventoryOpKind
}

/** Pure: apply income/expense delta to a stock list. */
export function applyOptimisticStock(
  items: InventoryItem[],
  itemId: string,
  type: 'income' | 'expense',
  quantity: number,
): InventoryItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item
    const next =
      type === 'income' ? item.currentStock + quantity : item.currentStock - quantity
    return { ...item, currentStock: next }
  })
}

export function expectedStockAfter(
  currentStock: number,
  type: 'income' | 'expense',
  quantity: number,
): number {
  return type === 'income' ? currentStock + quantity : currentStock - quantity
}

export function isInventoryStockConflictDetail(detail: string): boolean {
  return /недостаточно запасов|доступно/i.test(detail)
}

export function isStockDrift(expected: number, actual: number, epsilon = 0.0001): boolean {
  return Math.abs(expected - actual) > epsilon
}

export async function enqueueInventoryOperationOffline(
  input: InventoryOfflinePayload,
  currentItems: InventoryItem[],
): Promise<{ queueId: string; items: InventoryItem[] }> {
  const item = currentItems.find((row) => row.id === input.itemId)
  if (!item) {
    throw new Error('Позиция не найдена в локальном кэше. Откройте склад онлайн один раз.')
  }

  const queueId = crypto.randomUUID()
  const now = Date.now()
  const nextStock = expectedStockAfter(item.currentStock, input.type, input.quantity)
  const nextItems = applyOptimisticStock(
    currentItems,
    input.itemId,
    input.type,
    input.quantity,
  )
  const updatedItem = nextItems.find((row) => row.id === input.itemId)
  // non-null: applyOptimisticStock always includes itemId when present in list
  if (!updatedItem) throw new Error('Optimistic stock update failed')

  const payload = inventoryOperationToApi({
    itemId: input.itemId,
    type: input.type,
    quantity: input.quantity,
    reason: input.reason,
    supplier: input.supplier,
    cost: input.cost,
    date: input.date,
    purpose: input.purpose,
  })

  const row: InventoryQueueItem = {
    id: queueId,
    type: input.queueType,
    itemId: input.itemId,
    payload,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    retries: 0,
    expectedStockAfter: nextStock,
  }

  await db.inventoryQueue.add(row)
  await db.inventory.put(updatedItem)

  return { queueId, items: nextItems }
}

export async function requeueInventoryItem(id: string): Promise<void> {
  const item = await db.inventoryQueue.get(id)
  if (!item) return
  await db.inventoryQueue.update(id, {
    status: 'pending',
    retries: 0,
    lastError: undefined,
    updatedAt: Date.now(),
  })
}

export async function listInventoryIssues(): Promise<InventoryQueueItem[]> {
  const rows = await db.inventoryQueue.toArray()
  return rows
    .filter((row) => row.status === 'error' || row.status === 'conflict')
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
