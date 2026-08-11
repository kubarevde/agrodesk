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
import {
  applyChecklistDoneToCaches,
  applyRepairPatchToCaches,
  mergeChecklistItemIntoCaches,
} from './lib/checklistCache'
import type {
  ChecklistItemInput,
  RepairCreatePayload,
  RepairFilters,
  RepairJournalEntry,
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
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ['repair-journal'] })
      const previous = qc.getQueriesData({ queryKey: ['repair-journal'] })
      const patch: Partial<RepairJournalEntry> = {}
      if (payload.status !== undefined) patch.status = payload.status
      if (payload.waitingParts !== undefined) patch.waitingParts = payload.waitingParts
      if (payload.priority !== undefined) patch.priority = payload.priority
      if (payload.dateReturned !== undefined) patch.dateReturned = payload.dateReturned
      if (payload.description !== undefined) patch.description = payload.description
      if (Object.keys(patch).length > 0) {
        applyRepairPatchToCaches(qc, id, patch)
      }
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          qc.setQueryData(key, data)
        }
      }
      toast.error(apiErrorMessage(error, 'Не удалось обновить'))
    },
    onSuccess: (entry, vars) => {
      applyRepairPatchToCaches(qc, vars.id, entry)
      if (vars.payload.createExpense || vars.payload.status === 'done') {
        void qc.invalidateQueries({ queryKey: ['repair-journal'] })
      }
      toast.success(
        vars.payload.status === 'done' ? 'Запись обновлена' : 'Изменения сохранены',
      )
    },
  })
}

export function useToggleChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, isDone }: { itemId: string; isDone: boolean }) =>
      updateChecklistItem(itemId, { isDone }),
    onMutate: async ({ itemId, isDone }) => {
      await qc.cancelQueries({ queryKey: ['repair-journal'] })
      const previous = qc.getQueriesData({ queryKey: ['repair-journal'] })
      applyChecklistDoneToCaches(qc, itemId, isDone)
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          qc.setQueryData(key, data)
        }
      }
      toast.error(apiErrorMessage(error, 'Не удалось обновить пункт'))
    },
    onSuccess: (item) => {
      mergeChecklistItemIntoCaches(qc, item)
    },
    // Do not invalidate here: refetch can briefly restore stale checklist rows and
    // undo the optimistic UI while the detail dialog is still open.
  })
}

export function useAddChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ repairId, item }: { repairId: string; item: ChecklistItemInput }) =>
      addChecklistItem(repairId, item),
    onSuccess: async (item) => {
      mergeChecklistItemIntoCaches(qc, item)
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
