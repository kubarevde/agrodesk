import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Location, WorkType } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { locationFromApi, workTypeFromApi } from '@/lib/transformers'
import type { LocationFormValues, WorkTypeFormValues } from './schemas'

async function invalidateReferences(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['locations'] }),
    queryClient.invalidateQueries({ queryKey: ['work-types'] }),
  ])
}

export function useSettingsLocations() {
  return useQuery({
    queryKey: ['locations', 'settings'],
    queryFn: async (): Promise<Location[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/locations')
      return data.map(locationFromApi)
    },
  })
}

export function useSettingsWorkTypes() {
  return useQuery({
    queryKey: ['work-types', 'settings'],
    queryFn: async (): Promise<WorkType[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/work-types')
      return data.map(workTypeFromApi)
    },
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: LocationFormValues) => {
      const { data } = await api.post<Record<string, unknown>>('/api/locations', {
        name: payload.name,
        description: payload.description || undefined,
      })
      const created = locationFromApi(data)
      if (payload.isActive === false) {
        const { data: updated } = await api.patch<Record<string, unknown>>(
          `/api/locations/${created.id}`,
          { is_active: false },
        )
        return locationFromApi(updated)
      }
      return created
    },
    onSuccess: async () => {
      await invalidateReferences(queryClient)
      toast.success('Объект добавлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить объект')),
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<LocationFormValues>) => {
      const { data } = await api.patch<Record<string, unknown>>(`/api/locations/${id}`, {
        name: payload.name,
        description: payload.description,
        is_active: payload.isActive,
      })
      return locationFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await invalidateReferences(queryClient)
      if (variables.isActive === false) toast.success('Объект деактивирован')
      else if (variables.isActive === true) toast.success('Объект активирован')
      else toast.success('Объект обновлён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить объект')),
  })
}

export function useCreateWorkType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: WorkTypeFormValues) => {
      const { data } = await api.post<Record<string, unknown>>('/api/work-types', {
        name: payload.name,
        category: payload.category || undefined,
      })
      const created = workTypeFromApi(data)
      if (payload.isActive === false) {
        const { data: updated } = await api.patch<Record<string, unknown>>(
          `/api/work-types/${created.id}`,
          { is_active: false },
        )
        return workTypeFromApi(updated)
      }
      return created
    },
    onSuccess: async () => {
      await invalidateReferences(queryClient)
      toast.success('Тип работ добавлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить тип работ')),
  })
}

export function useUpdateWorkType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<WorkTypeFormValues>) => {
      const { data } = await api.patch<Record<string, unknown>>(`/api/work-types/${id}`, {
        name: payload.name,
        category: payload.category,
        is_active: payload.isActive,
      })
      return workTypeFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await invalidateReferences(queryClient)
      if (variables.isActive === false) toast.success('Тип работ деактивирован')
      else if (variables.isActive === true) toast.success('Тип работ активирован')
      else toast.success('Тип работ обновлён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить тип работ')),
  })
}

export type OrganizationSettings = {
  timezone: string
  available_timezones: string[]
}

export function useOrganizationSettings() {
  return useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: async (): Promise<OrganizationSettings> => {
      const { data } = await api.get<OrganizationSettings>('/api/settings/organization')
      return {
        timezone: data.timezone || 'Asia/Bangkok',
        available_timezones: data.available_timezones ?? [],
      }
    },
  })
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { timezone: string }) => {
      const { data } = await api.patch<OrganizationSettings>(
        '/api/settings/organization',
        payload,
      )
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] })
      toast.success('Часовой пояс сохранён')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось сохранить часовой пояс')),
  })
}
