import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { inventoryOperationFromApi, inventoryOperationToApi } from '@/lib/transformers'
import type { InventoryItem } from '@/types'
import { enqueueInventoryOperationOffline } from './offlineInventory'
import type {
  AdjustmentFormValues,
  ExpenseFormValues,
  IncomeFormValues,
} from './schemas'

async function runInventoryMutationOffline(
  queryClient: ReturnType<typeof useQueryClient>,
  input: Parameters<typeof enqueueInventoryOperationOffline>[0],
  successToast: string,
) {
  const current = queryClient.getQueryData<InventoryItem[]>(['inventory']) ?? []
  const { items } = await enqueueInventoryOperationOffline(input, current)
  queryClient.setQueryData(['inventory'], items)
  toast.info(successToast)
  return { offline: true as const }
}

export function useCreateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async (payload: IncomeFormValues) => {
      if (!navigator.onLine) {
        return runInventoryMutationOffline(
          queryClient,
          {
            itemId: payload.itemId,
            type: 'income',
            quantity: payload.quantity,
            supplier: payload.supplier,
            cost: payload.cost,
            date: payload.date,
            queueType: 'income',
          },
          'Приход сохранён офлайн — синхронизируется при появлении сети',
        )
      }

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
      return { offline: false as const, operation: inventoryOperationFromApi(data) }
    },
    onSuccess: async (result) => {
      if (result.offline) return
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
    networkMode: 'always',
    mutationFn: async (payload: ExpenseFormValues) => {
      if (!navigator.onLine) {
        return runInventoryMutationOffline(
          queryClient,
          {
            itemId: payload.itemId,
            type: 'expense',
            quantity: payload.quantity,
            reason: payload.reason,
            date: payload.date,
            queueType: 'expense',
          },
          'Расход сохранён офлайн — синхронизируется при появлении сети',
        )
      }

      const { data } = await api.post<Record<string, unknown>>(
        '/api/inventory/operations',
        inventoryOperationToApi({
          itemId: payload.itemId,
          type: 'expense',
          quantity: payload.quantity,
          reason: payload.reason,
          date: payload.date,
        }),
      )
      return { offline: false as const, operation: inventoryOperationFromApi(data) }
    },
    onSuccess: async (result) => {
      if (result.offline) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] }),
      ])
      toast.success('Расход оформлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось оформить расход')),
  })
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient()

  return useMutation({
    networkMode: 'always',
    mutationFn: async (payload: AdjustmentFormValues) => {
      const type = payload.direction === 'increase' ? 'income' : 'expense'
      if (!navigator.onLine) {
        return runInventoryMutationOffline(
          queryClient,
          {
            itemId: payload.itemId,
            type,
            quantity: payload.quantity,
            reason: payload.reason,
            date: payload.date,
            purpose: 'adjustment',
            queueType: 'adjustment',
          },
          'Корректировка сохранена офлайн — синхронизируется при появлении сети',
        )
      }

      const { data } = await api.post<Record<string, unknown>>(
        '/api/inventory/operations',
        inventoryOperationToApi({
          itemId: payload.itemId,
          type,
          quantity: payload.quantity,
          reason: payload.reason,
          date: payload.date,
          purpose: 'adjustment',
        }),
      )
      return { offline: false as const, operation: inventoryOperationFromApi(data) }
    },
    onSuccess: async (result) => {
      if (result.offline) return
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'operations'] }),
      ])
      toast.success('Корректировка остатка оформлена')
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось оформить корректировку')),
  })
}
