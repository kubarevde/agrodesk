import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { db } from '@/lib/db'
import { flushSyncQueue } from '@/lib/sync'
import { displayDateToIso, inventoryItemFromApi, inventoryOperationFromApi } from '@/lib/transformers'
import {
  buildInventoryItemUpdateBody,
  inventoryCropPayload,
  inventoryVarietyPayload,
} from '@/features/inventory/inventoryItemPayload'

import type { InventoryItem, InventoryQueueItem } from '@/types'
import { requeueInventoryItem } from './offlineInventory'
import {
  filterInventoryBySearch,
  filterInventoryByStatus,
  inventoryListQueryParams,
  type InventoryListStatus,
} from './inventorySearch'
import type { InventoryItemFormValues } from './schemas'
import { isHarvestCategory } from './utils'

async function fetchInventoryOnline(params?: {
  category?: string
  search?: string
  status?: InventoryListStatus
  /** Optional crop name map for client-side search fallback */
  cropNameByCode?: Record<string, string>
}): Promise<InventoryItem[]> {
  const search = (params?.search ?? '').trim()
  const category =
    params?.category && params.category !== 'all' ? params.category : undefined
  const status = params?.status ?? 'active'
  const { data } = await api.get<Record<string, unknown>[]>('/api/inventory', {
    params: inventoryListQueryParams({
      status,
      category,
      search,
    }),
  })
  let items = data.map(inventoryItemFromApi)
  // Belt-and-suspenders: if an older API ignores `status`/`search`, still filter locally.
  items = filterInventoryByStatus(items, status)
  if (search) {
    items = filterInventoryBySearch(items, search, params?.cropNameByCode)
  }
  // Keep Dexie cache as full active list only when unfiltered active view
  if (!category && !search && status === 'active') {
    await db.inventory.clear()
    await db.inventory.bulkPut(items)
  }
  return items
}

export function useInventory(options?: {
  enabled?: boolean
  category?: string
  search?: string
  status?: InventoryListStatus
  cropNameByCode?: Record<string, string>
}) {
  const category = options?.category
  const search = (options?.search ?? '').trim()
  const status = options?.status ?? 'active'
  const cropNameByCode = options?.cropNameByCode
  return useQuery({
    queryKey: ['inventory', { category: category ?? 'all', search, status }],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.inventory.toArray()
        let rows = filterInventoryByStatus(cached, status)
        if (rows.length === 0 && status === 'active') {
          throw new Error('Нет локального кэша склада. Откройте раздел онлайн один раз.')
        }
        if (category && category !== 'all') {
          rows = rows.filter((item) => item.category === category)
        }
        if (search) {
          rows = filterInventoryBySearch(rows, search, cropNameByCode)
        }
        return rows
      }
      try {
        return await fetchInventoryOnline({
          category,
          search,
          status,
          cropNameByCode,
        })
      } catch (error) {
        const cached = await db.inventory.toArray()
        if (cached.length > 0 && status === 'active') {
          let rows = filterInventoryByStatus(cached, 'active')
          if (category && category !== 'all') {
            rows = rows.filter((item) => item.category === category)
          }
          if (search) rows = filterInventoryBySearch(rows, search, cropNameByCode)
          return rows
        }
        throw error
      }
    },
    enabled: options?.enabled !== false,
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

export type InventoryOperationsFilters = {
  limit?: number
  from?: string
  to?: string
}

export function useInventoryOperations(filters: InventoryOperationsFilters = { limit: 10 }) {
  const { limit, from, to } = filters
  return useQuery({
    queryKey: ['inventory', 'operations', { limit, from, to }],
    queryFn: async () => {
      const params: Record<string, string | number> = {}
      if (limit != null) params.limit = limit
      if (from) params.from_date = displayDateToIso(from)
      if (to) params.to_date = displayDateToIso(to)
      const { data } = await api.get<Record<string, unknown>[]>('/api/inventory/operations', {
        params,
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
        variety_id: inventoryVarietyPayload(payload.category, cropCode, payload.varietyId),
      })
      return inventoryItemFromApi(data)
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
    }: {
      id: string
    } & Partial<InventoryItemFormValues>) => {
      const body = buildInventoryItemUpdateBody(payload)
      const { data } = await api.patch<Record<string, unknown>>(`/api/inventory/${id}`, body)
      const item = inventoryItemFromApi(data)
      const sentCrop = inventoryCropPayload(payload.category, payload.cropCode)
      if (sentCrop && !item.cropCode) {
        throw new Error(
          'Сервер не сохранил культуру (в ответе нет crop_code). ' +
            'Перезапустите backend на порту из Vite proxy (обычно :8000) с актуальным кодом.',
        )
      }
      return item
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      toast.success('Позиция обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить позицию')),
  })
}

export function useArchiveInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<Record<string, unknown>>(`/api/inventory/${id}/archive`, {
        reason,
      })
      return inventoryItemFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Позиция архивирована')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось архивировать позицию')),
  })
}

export function useRestoreInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data } = await api.post<Record<string, unknown>>(`/api/inventory/${id}/restore`, {
        comment: comment || undefined,
      })
      return inventoryItemFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Позиция восстановлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось восстановить позицию')),
  })
}

export function useHardDeleteInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.delete(`/api/inventory/${id}`, { data: { reason } })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Позиция удалена безвозвратно')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить позицию')),
  })
}

export type ArchiveEligibility = {
  itemId: string
  name: string
  currentStock: number
  isActive: boolean
  stockBlocks: boolean
  hasHistory: boolean
  canHardDelete: boolean
  canArchive: boolean
}

export function useInventoryArchiveEligibility(itemId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['inventory', 'archive-eligibility', itemId],
    queryFn: async (): Promise<ArchiveEligibility> => {
      const { data } = await api.get<Record<string, unknown>>(
        `/api/inventory/${itemId}/archive-eligibility`,
      )
      return {
        itemId: String(data.item_id),
        name: String(data.name ?? ''),
        currentStock: Number(data.current_stock ?? 0),
        isActive: data.is_active !== false,
        stockBlocks: data.stock_blocks === true,
        hasHistory: data.has_history === true,
        canHardDelete: data.can_hard_delete === true,
        canArchive: data.can_archive === true,
      }
    },
    enabled: Boolean(itemId) && enabled,
  })
}

export {
  useCreateIncome,
  useCreateExpense,
  useCreateAdjustment,
} from './operationHooks'
