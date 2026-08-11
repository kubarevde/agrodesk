import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import {
  mapRotationMatrix,
  mapRotationPlan,
  type RotationMatrix,
  type RotationPlan,
  type RotationPlanWrite,
} from './rotationTypes'

export function useFieldRotationMatrix(
  fieldId: string | null | undefined,
  options?: { enabled?: boolean; fromYear?: number; toYear?: number },
) {
  return useQuery({
    queryKey: [
      'field-rotation',
      fieldId,
      options?.fromYear ?? 'default',
      options?.toYear ?? 'default',
    ],
    enabled: Boolean(fieldId) && options?.enabled !== false,
    queryFn: async (): Promise<RotationMatrix> => {
      const { data } = await api.get<Record<string, unknown>>(
        `/api/fields/${fieldId}/rotation`,
        {
          params: {
            ...(options?.fromYear != null ? { from_year: options.fromYear } : {}),
            ...(options?.toYear != null ? { to_year: options.toYear } : {}),
          },
        },
      )
      return mapRotationMatrix(data)
    },
  })
}

export function useCreateRotationPlan(fieldId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RotationPlanWrite) => {
      const { data } = await api.post<Record<string, unknown>>(
        `/api/fields/${fieldId}/rotation-plans`,
        payload,
      )
      return mapRotationPlan(data)
    },
    onSuccess: async (plan) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['field-rotation', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-rotation-plans', fieldId] }),
      ])
      if (plan.warning) {
        toast.warning(plan.warning)
      } else {
        toast.success('План севооборота добавлен')
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить план')),
  })
}

export function useUpdateRotationPlan(fieldId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<RotationPlanWrite> & { id: string }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/fields/${fieldId}/rotation-plans/${id}`,
        payload,
      )
      return mapRotationPlan(data)
    },
    onSuccess: async (plan) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['field-rotation', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-rotation-plans', fieldId] }),
      ])
      if (plan.warning) {
        toast.warning(plan.warning)
      } else {
        toast.success('План обновлён')
      }
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось сохранить план')),
  })
}

export type { RotationPlan }
