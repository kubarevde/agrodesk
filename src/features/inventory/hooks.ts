import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { InventoryItem, InventoryOperation } from '@/types'
import { api } from '@/lib/api'
import type { ExpenseFormValues, IncomeFormValues } from './schemas'

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data } = await api.get<InventoryItem[]>('/api/inventory')
      return data
    },
  })
}

export function useInventoryOperations() {
  return useQuery({
    queryKey: ['inventory', 'operations'],
    queryFn: async () => {
      const { data } = await api.get<InventoryOperation[]>('/api/inventory/operations')
      return data
    },
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: IncomeFormValues) => {
      const { data } = await api.post<InventoryOperation>('/api/inventory/income', payload)
      return data
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
      const { data } = await api.post<InventoryOperation>('/api/inventory/expense', payload)
      return data
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
