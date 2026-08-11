import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ManualIncome, ManualIncomeFilters } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  manualIncomeCreateToApi,
  manualIncomeFiltersToApi,
  manualIncomeFromApi,
  manualIncomeUpdateToApi,
} from '@/lib/transformers'
import type { IncomeFormValues } from './incomeSchemas'

async function invalidateIncomeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['incomes'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['analytics'] }),
  ])
}

export function useManualIncomes(filters: ManualIncomeFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['incomes', filters],
    enabled,
    queryFn: async (): Promise<ManualIncome[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/incomes', {
        params: manualIncomeFiltersToApi(filters),
      })
      return data.map(manualIncomeFromApi)
    },
  })
}

export function useCreateManualIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: IncomeFormValues) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/incomes',
        manualIncomeCreateToApi(payload),
      )
      return manualIncomeFromApi(data)
    },
    onSuccess: async () => {
      await invalidateIncomeQueries(queryClient)
      toast.success('Доход добавлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить доход')),
  })
}

export function useUpdateManualIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & IncomeFormValues) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/incomes/${id}`,
        manualIncomeUpdateToApi(payload),
      )
      return manualIncomeFromApi(data)
    },
    onSuccess: async () => {
      await invalidateIncomeQueries(queryClient)
      toast.success('Доход обновлён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить доход')),
  })
}

export function useDeleteManualIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/incomes/${id}`)
    },
    onSuccess: async () => {
      await invalidateIncomeQueries(queryClient)
      toast.success('Доход удалён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить доход')),
  })
}
