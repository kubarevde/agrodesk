import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Location, WorkType } from '@/types'
import { AUTH_PERMISSIONS_QUERY_KEY } from '@/features/auth/utils'
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
        is_field_work: payload.isFieldWork,
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
        is_field_work: payload.isFieldWork,
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
  shipmentRequestsEnabled: boolean
}

export function useOrganizationSettings() {
  return useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: async (): Promise<OrganizationSettings> => {
      const { data } = await api.get<{
        timezone: string
        available_timezones: string[]
        shipment_requests_enabled?: boolean
      }>('/api/settings/organization')
      return {
        timezone: data.timezone || 'Asia/Bangkok',
        available_timezones: data.available_timezones ?? [],
        shipmentRequestsEnabled: data.shipment_requests_enabled !== false,
      }
    },
  })
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      timezone?: string
      shipmentRequestsEnabled?: boolean
    }) => {
      const body: Record<string, unknown> = {}
      if (payload.timezone != null) body.timezone = payload.timezone
      if (payload.shipmentRequestsEnabled != null) {
        body.shipment_requests_enabled = payload.shipmentRequestsEnabled
      }
      const { data } = await api.patch<{
        timezone: string
        available_timezones: string[]
        shipment_requests_enabled?: boolean
      }>('/api/settings/organization', body)
      return {
        timezone: data.timezone,
        available_timezones: data.available_timezones ?? [],
        shipmentRequestsEnabled: data.shipment_requests_enabled !== false,
      } satisfies OrganizationSettings
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] }),
        queryClient.invalidateQueries({ queryKey: AUTH_PERMISSIONS_QUERY_KEY }),
      ])
      toast.success('Настройки организации сохранены')
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось сохранить настройки организации')),
  })
}
