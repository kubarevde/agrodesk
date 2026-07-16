import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Expense, ExpenseFilters } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  expenseCreateToApi,
  expenseFiltersToApi,
  expenseFromApi,
  expenseUpdateToApi,
} from '@/lib/transformers'
import type { ExpenseFormValues } from './schemas'

async function invalidateExpenseQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['expenses'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ])
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async (): Promise<Expense[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/expenses', {
        params: expenseFiltersToApi(filters),
      })
      return data.map(expenseFromApi)
    },
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ExpenseFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/expenses',
        expenseCreateToApi(payload),
      )
      return expenseFromApi(data)
    },
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient)
      toast.success('Затрата добавлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить затрату')),
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & ExpenseFormValues) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/expenses/${id}`,
        expenseUpdateToApi(payload),
      )
      return expenseFromApi(data)
    },
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient)
      toast.success('Затрата обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить затрату')),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/expenses/${id}`)
    },
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient)
      toast.success('Затрата удалена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить затрату')),
  })
}
