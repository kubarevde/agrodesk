import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import type { TaskFormValues } from './schemas'
import { mapTask, type OrgTask, type TaskFilters } from './types'

async function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries({ queryKey: ['tasks'] })
}

export function useTasks(filters: TaskFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['tasks', filters],
    enabled,
    queryFn: async (): Promise<OrgTask[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/tasks', {
        params: {
          status: filters.status ?? 'active',
          scope: filters.scope ?? 'all',
          ...(filters.assigneeId ? { assignee_id: filters.assigneeId } : {}),
        },
      })
      if (!Array.isArray(data)) return []
      return data.map(mapTask)
    },
  })
}

function formToBody(values: TaskFormValues) {
  return {
    title: values.title.trim(),
    description: values.description?.trim() || null,
    visibility_type: values.visibilityType,
    assignee_id:
      values.visibilityType === 'specific_employee' ? values.assigneeId || null : null,
  }
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: TaskFormValues) => {
      const { data } = await api.post<Record<string, unknown>>('/api/tasks', formToBody(values))
      return mapTask(data)
    },
    onSuccess: async () => {
      await invalidateTasks(qc)
      toast.success('Задача создана')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать задачу')),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TaskFormValues }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/tasks/${id}`,
        formToBody(values),
      )
      return mapTask(data)
    },
    onSuccess: async () => {
      await invalidateTasks(qc)
      toast.success('Задача обновлена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить задачу')),
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Record<string, unknown>>(`/api/tasks/${id}/complete`)
      return mapTask(data)
    },
    onSuccess: async () => {
      await invalidateTasks(qc)
      toast.success('Задача отмечена выполненной')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось выполнить задачу')),
  })
}

export function useReopenTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<Record<string, unknown>>(`/api/tasks/${id}/reopen`)
      return mapTask(data)
    },
    onSuccess: async () => {
      await invalidateTasks(qc)
      toast.success('Задача снова активна')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось открыть задачу')),
  })
}

export function useCancelTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.post<Record<string, unknown>>(`/api/tasks/${id}/cancel`, {
        cancellation_reason: reason,
      })
      return mapTask(data)
    },
    onSuccess: async () => {
      await invalidateTasks(qc)
      toast.success('Задача отменена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось отменить задачу')),
  })
}
