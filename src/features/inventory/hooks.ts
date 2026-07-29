import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { db } from '@/lib/db'
import { flushSyncQueue } from '@/lib/sync'
import { inventoryItemFromApi, inventoryOperationFromApi } from '@/lib/transformers'
import type { InventoryItem, InventoryQueueItem } from '@/types'
import { requeueInventoryItem } from './offlineInventory'
import type { InventoryItemFormValues } from './schemas'

async function fetchInventoryOnline(): Promise<InventoryItem[]> {
  const { data } = await api.get<Record<string, unknown>[]>('/api/inventory', {
    params: { is_active: true },
  })
  const items = data.map(inventoryItemFromApi)
  await db.inventory.clear()
  await db.inventory.bulkPut(items)
  return items
}

export function useInventory(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.inventory.toArray()
        if (cached.length > 0) return cached.filter((item) => item.isActive !== false)
        throw new Error('Нет локального кэша склада. Откройте раздел онлайн один раз.')
      }
      try {
        return await fetchInventoryOnline()
      } catch (error) {
        const cached = await db.inventory.toArray()
        if (cached.length > 0) return cached.filter((item) => item.isActive !== false)
        throw error
      }
    },
    enabled: options?.enabled ?? true,
    networkMode: 'offlineFirst',
  })
}

export function useInventoryQueueIssues() {
  const [items, setItems] = useState<InventoryQueueItem[]>([])

  useEffect(() => {
    const sub = liveQuery(() =>
      db.inventoryQueue
        .filter((row) => row.status === 'error' || row.status === 'conflict')
        .toArray(),
    ).subscribe({
      next: (rows) => setItems(rows.sort((a, b) => b.updatedAt - a.updatedAt)),
      error: () => setItems([]),
    })
    return () => sub.unsubscribe()
  }, [])

  return items
}

export function useRetryInventoryQueueItem() {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: async (id: string) => {
      await requeueInventoryItem(id)
      return flushSyncQueue()
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      if (result.synced > 0) toast.success('Операция склада синхронизирована')
      else if (result.conflicts > 0) toast.message('Конфликт остатка — проверьте позицию')
      else if (result.failed > 0) toast.error('Не удалось синхронизировать операцию')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Повтор не выполнен')),
  })
}

export function useInventoryOperations(limit = 10) {
  return useQuery({
    queryKey: ['inventory', 'operations', { limit }],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/inventory/operations', {
        params: { limit },
      })
      return data.map(inventoryOperationFromApi)
    },
  })
}

export function useInventoryItemOperations(itemId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['inventory', 'operations', 'item', itemId],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>(
        `/api/inventory/${itemId}/operations`,
        { params: { limit: 20, exclude_opening: false } },
      )
      return data.map(inventoryOperationFromApi)
    },
    enabled: Boolean(itemId) && enabled,
  })
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: InventoryItemFormValues) => {
      const { data } = await api.post<Record<string, unknown>>('/api/inventory', {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        current_stock: payload.currentStock,
        min_stock: payload.minStock,
        total_capacity: payload.totalCapacity,
      })
      const created = inventoryItemFromApi(data)
      if (payload.isActive === false) {
        const { data: updated } = await api.patch<Record<string, unknown>>(
          `/api/inventory/${created.id}`,
          { is_active: false },
        )
        return inventoryItemFromApi(updated)
      }
      return created
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Позиция ТМЦ добавлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить позицию')),
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<InventoryItemFormValues>) => {
      const { data } = await api.patch<Record<string, unknown>>(`/api/inventory/${id}`, {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        min_stock: payload.minStock,
        total_capacity: payload.totalCapacity,
        is_active: payload.isActive,
      })
      return inventoryItemFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      if (variables.isActive === false) toast.success('Позиция архивирована (история сохранена)')
      else if (variables.isActive === true) toast.success('Позиция восстановлена из архива')
      else toast.success('Позиция обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить позицию')),
  })
}

export {
  useCreateIncome,
  useCreateExpense,
  useCreateAdjustment,
} from './operationHooks'
