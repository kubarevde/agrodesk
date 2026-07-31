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
import {
  filterInventoryBySearch,
  inventoryListQueryParams,
} from './inventorySearch'
import type { InventoryItemFormValues } from './schemas'
import { isHarvestCategory } from './utils'
import {
  buildInventoryItemUpdateBody,
  inventoryCropPayload,
} from './inventoryItemPayload'

async function fetchInventoryOnline(params?: {
  category?: string
  search?: string
  /** Optional crop name map for client-side search fallback */
  cropNameByCode?: Record<string, string>
}): Promise<InventoryItem[]> {
  const search = (params?.search ?? '').trim()
  const category =
    params?.category && params.category !== 'all' ? params.category : undefined
  const { data } = await api.get<Record<string, unknown>[]>('/api/inventory', {
    params: inventoryListQueryParams({
      isActive: true,
      category,
      search,
    }),
  })
  let items = data.map(inventoryItemFromApi)
  // Belt-and-suspenders: if an older API ignores `search`, still filter locally.
  if (search) {
    items = filterInventoryBySearch(items, search, params?.cropNameByCode)
  }
  // Keep Dexie cache as full active list only when unfiltered
  if (!category && !search) {
    await db.inventory.clear()
    await db.inventory.bulkPut(items)
  }
  return items
}

export function useInventory(options?: {
  enabled?: boolean
  category?: string
  search?: string
  cropNameByCode?: Record<string, string>
}) {
  const category = options?.category
  const search = (options?.search ?? '').trim()
  const cropNameByCode = options?.cropNameByCode
  return useQuery({
    queryKey: ['inventory', { category: category ?? 'all', search }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.inventory.toArray()
        const active = cached.filter((item) => item.isActive !== false)
        if (active.length === 0) {
          throw new Error('Нет локального кэша склада. Откройте раздел онлайн один раз.')
        }
        let rows = active
        if (category && category !== 'all') {
          rows = rows.filter((item) => item.category === category)
        }
        if (search) {
          rows = filterInventoryBySearch(rows, search, cropNameByCode)
        }
        return rows
      }
      try {
        return await fetchInventoryOnline({ category, search, cropNameByCode })
      } catch (error) {
        const cached = await db.inventory.toArray()
        if (cached.length > 0) {
          let rows = cached.filter((item) => item.isActive !== false)
          if (category && category !== 'all') {
            rows = rows.filter((item) => item.category === category)
          }
          if (search) rows = filterInventoryBySearch(rows, search, cropNameByCode)
          return rows
        }
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
        { params: { limit: 100, exclude_opening: false } },
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
      const cropCode = inventoryCropPayload(payload.category, payload.cropCode)
      if (isHarvestCategory(payload.category) && !cropCode) {
        throw new Error('Для позиций «Урожай на складе» необходимо указать культуру.')
      }
      const { data } = await api.post<Record<string, unknown>>('/api/inventory', {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        current_stock: payload.currentStock,
        min_stock: payload.minStock,
        total_capacity: payload.totalCapacity,
        crop_code: cropCode,
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
      previousIsActive,
      ...payload
    }: {
      id: string
      /** Prior isActive — used only for toast copy */
      previousIsActive?: boolean
    } & Partial<InventoryItemFormValues>) => {
      const body = buildInventoryItemUpdateBody(payload)
      const { data } = await api.patch<Record<string, unknown>>(`/api/inventory/${id}`, body)
      const item = inventoryItemFromApi(data)
      // Guard against stale backend (e.g. Vite proxy → old :8000 without crop_code in schema):
      // request can succeed (200) while crop is silently dropped.
      const sentCrop = inventoryCropPayload(payload.category, payload.cropCode)
      if (sentCrop && !item.cropCode) {
        throw new Error(
          'Сервер не сохранил культуру (в ответе нет crop_code). ' +
            'Перезапустите backend на порту из Vite proxy (обычно :8000) с актуальным кодом.',
        )
      }
      return { item, previousIsActive }
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      const wasActive = variables.previousIsActive
      if (variables.isActive === false) {
        toast.success('Позиция архивирована (история сохранена)')
      } else if (wasActive === false && variables.isActive === true) {
        toast.success('Позиция восстановлена из архива')
      } else {
        toast.success('Позиция обновлена')
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить позицию')),
  })
}

export {
  useCreateIncome,
  useCreateExpense,
  useCreateAdjustment,
} from './operationHooks'
