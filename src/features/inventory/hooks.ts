import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  inventoryItemFromApi,
  inventoryOperationFromApi,
  inventoryOperationToApi,
} from '@/lib/transformers'
import type { ExpenseFormValues, IncomeFormValues } from './schemas'

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
    onError: () => toast.error('Не удалось оформить приход'),
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
    onError: () => toast.error('Не удалось оформить расход'),
  })
}
