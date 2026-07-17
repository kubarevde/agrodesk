import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { db } from '@/lib/db'
import { displayDateToIso } from '@/lib/transformers'
import {
  planCreateToApi,
  planFiltersToApi,
  planFromApi,
  planFromStored,
  planToStored,
} from './api'
import type { AgroPlan, AgroPlanFilters, AgroPlanFormInput } from './types'

function filterStoredPlans(plans: AgroPlan[], filters: AgroPlanFilters) {
  return plans.filter((plan) => {
    if (filters.fieldId) {
      const matchesSingular = plan.fieldId === filters.fieldId
      const matchesMulti = plan.fieldIds.includes(filters.fieldId)
      if (!matchesSingular && !matchesMulti) return false
    }
    if (filters.employeeId && plan.employeeId !== filters.employeeId) return false
    if (filters.month) {
      const start = plan.plannedDate
      const end = plan.plannedEndDate ?? plan.plannedDate
      const monthStart = `${filters.month}-01`
      const monthEnd = `${filters.month}-31`
      if (start > monthEnd || end < monthStart) return false
    }
    if (filters.plannedDate) {
      const start = plan.plannedDate
      const end = plan.plannedEndDate ?? plan.plannedDate
      if (filters.plannedDate < start || filters.plannedDate > end) return false
    }
    return true
  })
}

export function useAgroPlans(
  filters: AgroPlanFilters = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['agro-plan', filters],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.agroPlan.toArray()
        return filterStoredPlans(cached.map(planFromStored), filters)
      }

      const { data } = await api.get<Record<string, unknown>[]>('/api/agro-plan', {
        params: planFiltersToApi(filters),
      })
      const plans = data.map(planFromApi)
      await db.agroPlan.bulkPut(plans.map(planToStored))
      return plans
    },
  })
}

export function useAgroPlansToday(employeeId?: string) {
  return useQuery({
    queryKey: ['agro-plan', 'today', employeeId ?? 'me'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const today = new Date().toISOString().slice(0, 10)
        const cached = await db.agroPlan.toArray()
        return filterStoredPlans(cached.map(planFromStored), {
          employeeId,
          plannedDate: today,
        }).filter((plan) => plan.status === 'planned' || plan.status === 'in_progress')
      }

      const { data } = await api.get<Record<string, unknown>[]>('/api/agro-plan/today', {
        params: employeeId ? { employee_id: employeeId } : undefined,
      })
      return data.map(planFromApi)
    },
  })
}

export function useCreateAgroPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AgroPlanFormInput) => {
      const { data } = await api.post<Record<string, unknown>>(
        '/api/agro-plan',
        planCreateToApi({
          ...input,
          fieldIds: input.fieldIds?.length
            ? input.fieldIds
            : input.fieldId
              ? [input.fieldId]
              : [],
          plannedDateIso: displayDateToIso(input.plannedDate),
          plannedEndDateIso: input.plannedEndDate
            ? displayDateToIso(input.plannedEndDate)
            : undefined,
        }),
      )
      return planFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agro-plan'] })
      toast.success('Работа запланирована')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать план')),
  })
}

export function useUpdateAgroPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<AgroPlanFormInput> & { id: string; status?: string }) => {
      const body: Record<string, unknown> = {}
      const fieldIds =
        input.fieldIds && input.fieldIds.length > 0
          ? input.fieldIds
          : input.fieldId
            ? [input.fieldId]
            : undefined
      if (fieldIds) {
        body.field_ids = fieldIds
        body.field_id = fieldIds[0]
      }
      if (input.workTypeId) body.work_type_id = input.workTypeId
      if (input.plannedDate) body.planned_date = displayDateToIso(input.plannedDate)
      if (input.plannedEndDate !== undefined) {
        body.planned_end_date = input.plannedEndDate
          ? displayDateToIso(input.plannedEndDate)
          : null
      }
      if (input.equipmentId !== undefined) body.equipment_id = input.equipmentId || null
      if (input.implementId !== undefined) body.implement_id = input.implementId || null
      if (input.employeeId !== undefined) body.employee_id = input.employeeId || null
      if (input.notes !== undefined) body.notes = input.notes || null
      if (input.status) body.status = input.status

      const { data } = await api.patch<Record<string, unknown>>(`/api/agro-plan/${id}`, body)
      return planFromApi(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agro-plan'] })
      toast.success('План обновлён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить план')),
  })
}

export function useDeleteAgroPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/agro-plan/${id}`)
      await db.agroPlan.delete(id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agro-plan'] })
      toast.success('План удалён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить план')),
  })
}
