import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiError'
import {
  checklistToPurchasePlanner,
  createPurchaseItem,
  deletePurchaseItem,
  fetchPurchaseItems,
  fetchUrgentPurchases,
  updatePurchaseItem,
} from './api'
import type { PurchaseCreatePayload, PurchaseFilters, PurchaseUpdatePayload } from './types'

export function usePurchaseItems(filters: PurchaseFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['purchase-planner', filters],
    queryFn: () => fetchPurchaseItems(filters),
    enabled,
  })
}

export function useUrgentPurchases() {
  return useQuery({
    queryKey: ['purchase-planner', 'urgent'],
    queryFn: fetchUrgentPurchases,
  })
}

export function useCreatePurchaseItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PurchaseCreatePayload) => createPurchaseItem(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase-planner'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Пункт добавлен в планировщик')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать')),
  })
}

export function useUpdatePurchaseItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PurchaseUpdatePayload }) =>
      updatePurchaseItem(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase-planner'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Обновлено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить')),
  })
}

export function useDeletePurchaseItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePurchaseItem(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase-planner'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Удалено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить')),
  })
}

export function useChecklistToPurchasePlanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (checklistItemId: string) => checklistToPurchasePlanner(checklistItemId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase-planner'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Добавлено в планировщик закупок')
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось добавить в планировщик')),
  })
}
