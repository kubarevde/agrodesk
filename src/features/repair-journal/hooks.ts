import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/lib/apiError'
import {
  addChecklistItem,
  createRepair,
  deleteChecklistItem,
  fetchActiveRepairs,
  fetchRepairs,
  updateChecklistItem,
  updateRepair,
} from './api'
import type {
  ChecklistItemInput,
  RepairCreatePayload,
  RepairFilters,
  RepairUpdatePayload,
} from './types'

export function useRepairs(filters: RepairFilters = {}) {
  return useQuery({
    queryKey: ['repair-journal', filters],
    queryFn: () => fetchRepairs(filters),
  })
}

export function useActiveRepairs() {
  return useQuery({
    queryKey: ['repair-journal', 'active-count'],
    queryFn: fetchActiveRepairs,
  })
}

export function useCreateRepair() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RepairCreatePayload) => createRepair(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['repair-journal'] })
      toast.success('Техника поставлена на ремонт')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать запись')),
  })
}

export function useUpdateRepair() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RepairUpdatePayload }) =>
      updateRepair(id, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['repair-journal'] })
      toast.success('Запись обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить')),
  })
}

export function useToggleChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      updateChecklistItem(itemId, { isDone }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['repair-journal'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить пункт')),
  })
}

export function useAddChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ repairId, item }: { repairId: string; item: ChecklistItemInput }) =>
      addChecklistItem(repairId, item),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['repair-journal'] })
      toast.success('Пункт добавлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить пункт')),
  })
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => deleteChecklistItem(itemId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['repair-journal'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить пункт')),
  })
}
