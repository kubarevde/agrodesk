import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  inventoryItemFromApi,
  inventoryOperationFromApi,
  inventoryOperationToApi,
} from '@/lib/transformers'
import type {
  ExpenseFormValues,
  IncomeFormValues,
  InventoryItemFormValues,
} from './schemas'

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/inventory', {
        params: { is_active: true },
      })
      return data.map(inventoryItemFromApi)
    },
  })
}

export function useInventoryOperations() {
  return useQuery({
    queryKey: ['inventory', 'operations'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/inventory/operations')
      return data.map(inventoryOperationFromApi)
    },
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: IncomeFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/inventory/operations',
        inventoryOperationToApi({
          itemId: payload.itemId,
          type: 'income',
          quantity: payload.quantity,
          supplier: payload.supplier,
          cost: payload.cost,
          date: payload.date,
        }),
      )
      return inventoryOperationFromApi(data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] }),
      ])
      toast.success('Приход оформлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось оформить приход')),
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ExpenseFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/inventory/operations',
        inventoryOperationToApi({
          itemId: payload.itemId,
          type: 'expense',
          quantity: payload.quantity,
          reason: payload.reason,
        }),
      )
      return inventoryOperationFromApi(data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] }),
      ])
      toast.success('Расход оформлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось оформить расход')),
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
      if (variables.isActive === false) toast.success('Позиция деактивирована')
      else if (variables.isActive === true) toast.success('Позиция активирована')
      else toast.success('Позиция обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить позицию')),
  })
}
