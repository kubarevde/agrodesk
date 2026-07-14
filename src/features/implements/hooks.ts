import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Implement } from '@/types'
import { api } from '@/lib/api'
import { db } from '@/lib/db'
import type {
  AttachFormValues,
  ImplementFormValues,
  MaintenanceFormValues,
} from './schemas'
import type { ImplementMaintenanceResponse, ImplementResponse } from './types'

type ImplementFilters = {
  category?: string
  equipmentId?: string
}

function toPayload(values: ImplementFormValues) {
  return {
    name: values.name,
    category: values.category,
    serial_number: values.serial_number || null,
    year_of_manufacture: values.year_of_manufacture ?? null,
    condition: values.condition,
    description: values.description || null,
    current_equipment_id: values.current_equipment_id || null,
    image_url: values.image_url || null,
  }
}

function filterImplements(items: Implement[], filters?: ImplementFilters): Implement[] {
  return items.filter((item) => {
    if (!item.is_active) return false
    if (filters?.category && item.category !== filters.category) return false
    if (filters?.equipmentId && item.current_equipment_id !== filters.equipmentId) return false
    return true
  })
}

export function useImplements(filters?: ImplementFilters) {
  return useQuery({
    queryKey: ['implements', filters?.category ?? 'all', filters?.equipmentId ?? 'all'],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.implements.toArray()
        return filterImplements(cached, filters)
      }

      const params: Record<string, string> = {}
      if (filters?.category) params.category = filters.category
      if (filters?.equipmentId) params.equipment_id = filters.equipmentId
      const { data } = await api.get<ImplementResponse[]>('/api/implements', {
        params: Object.keys(params).length ? params : undefined,
      })
      await db.implements.bulkPut(data)
      return data
    },
  })
}

export function useImplementDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['implements', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!navigator.onLine && id) {
        const cached = await db.implements.get(id)
        if (cached) return cached as ImplementResponse
      }

      const { data } = await api.get<ImplementResponse>(`/api/implements/${id}`)
      await db.implements.put(data)
      return data
    },
  })
}

export function useCreateImplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: ImplementFormValues) => {
      const { data } = await api.post<ImplementResponse>('/api/implements', toPayload(values))
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['implements'] })
      toast.success('Приспособление добавлено')
    },
    onError: () => toast.error('Не удалось добавить приспособление'),
  })
}

export function useUpdateImplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ImplementFormValues }) => {
      const { data } = await api.patch<ImplementResponse>(
        `/api/implements/${id}`,
        toPayload(values),
      )
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['implements'] })
      toast.success('Приспособление обновлено')
    },
    onError: () => toast.error('Не удалось обновить приспособление'),
  })
}

export function useDeleteImplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/implements/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['implements'] })
      toast.success('Приспособление удалено')
    },
    onError: () => toast.error('Не удалось удалить приспособление'),
  })
}

export function useAttachImplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: AttachFormValues }) => {
      const { data } = await api.patch<ImplementResponse>(`/api/implements/${id}/attach`, values)
      return data
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['implements'] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      ])
      toast.success('Приспособление прикреплено')
    },
    onError: () => toast.error('Не удалось прикрепить'),
  })
}

export function useDetachImplement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch<ImplementResponse>(`/api/implements/${id}/detach`)
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['implements'] })
      toast.success('Приспособление откреплено')
    },
    onError: () => toast.error('Не удалось открепить'),
  })
}

export function useImplementMaintenance(id: string | undefined) {
  return useQuery({
    queryKey: ['implements', id, 'maintenance'],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ImplementMaintenanceResponse[]>(
        `/api/implements/${id}/maintenance`,
      )
      return data
    },
  })
}

export function useAddImplementMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: MaintenanceFormValues }) => {
      const { data } = await api.post<ImplementMaintenanceResponse>(
        `/api/implements/${id}/maintenance`,
        {
          date: values.date,
          type: values.type,
          cost: values.cost ?? null,
          description: values.description || null,
        },
      )
      return data
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['implements', vars.id, 'maintenance'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ])
      toast.success('ТО записано')
    },
    onError: () => toast.error('Не удалось сохранить ТО'),
  })
}
