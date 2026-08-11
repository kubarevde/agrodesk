import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Location, WorkType } from '@/types'
import { AUTH_PERMISSIONS_QUERY_KEY } from '@/features/auth/utils'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { locationFromApi, workTypeFromApi } from '@/lib/transformers'
import type { LocationFormValues, WorkTypeFormValues } from './schemas'

async function invalidateLocations(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: ['locations'] })
}

async function invalidateWorkTypes(queryClient: ReturnType<typeof useQueryClient>) {
  // Do not invalidate locations here: refetching /api/locations runs ensure_field_work
  // and previously made «Полевая работа» appear as a new field in the Fields UI.
  await queryClient.invalidateQueries({ queryKey: ['work-types'] })
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
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
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
      await invalidateLocations(queryClient)
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
      const body: Record<string, unknown> = {}
      if (payload.name !== undefined) body.name = payload.name
      if (payload.description !== undefined) body.description = payload.description
      if (payload.isActive !== undefined) body.is_active = payload.isActive
      if (payload.latitude !== undefined) body.latitude = payload.latitude ?? null
      if (payload.longitude !== undefined) body.longitude = payload.longitude ?? null
      const { data } = await api.patch<Record<string, unknown>>(`/api/locations/${id}`, body)
      return locationFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await invalidateLocations(queryClient)
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
      await invalidateWorkTypes(queryClient)
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
      await invalidateWorkTypes(queryClient)
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
  /** Read-only for org UI — primary enablement is platform/superadmin. */
  marketplaceEnabled: boolean
  /** Employer toggle: show monetary earnings to employees (default true). */
  payrollVisibleToEmployees: boolean
  /** ISO timestamp — used by «Факт и прогноз» chart window. */
  createdAt: string | null
}

function organizationSettingsFromApi(data: {
  timezone: string
  available_timezones: string[]
  shipment_requests_enabled?: boolean
  marketplace_enabled?: boolean
  payroll_visible_to_employees?: boolean
  created_at?: string | null
}): OrganizationSettings {
  return {
    timezone: data.timezone || 'Asia/Bangkok',
    available_timezones: data.available_timezones ?? [],
    shipmentRequestsEnabled: data.shipment_requests_enabled !== false,
    marketplaceEnabled: data.marketplace_enabled === true,
    // Absent key → true (matches backend default).
    payrollVisibleToEmployees: data.payroll_visible_to_employees !== false,
    createdAt: data.created_at ?? null,
  }
}

export function useOrganizationSettings() {
  return useQuery({
    queryKey: ['settings', 'organization'],
    queryFn: async (): Promise<OrganizationSettings> => {
      const { data } = await api.get<{
        timezone: string
        available_timezones: string[]
        shipment_requests_enabled?: boolean
        marketplace_enabled?: boolean
        payroll_visible_to_employees?: boolean
        created_at?: string | null
      }>('/api/settings/organization')
      return organizationSettingsFromApi(data)
    },
  })
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      timezone?: string
      payrollVisibleToEmployees?: boolean
    }) => {
      const body: Record<string, unknown> = {}
      if (payload.timezone != null) body.timezone = payload.timezone
      if (payload.payrollVisibleToEmployees != null) {
        body.payroll_visible_to_employees = payload.payrollVisibleToEmployees
      }
      const { data } = await api.patch<{
        timezone: string
        available_timezones: string[]
        shipment_requests_enabled?: boolean
        marketplace_enabled?: boolean
        payroll_visible_to_employees?: boolean
        created_at?: string | null
      }>('/api/settings/organization', body)
      return organizationSettingsFromApi(data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] }),
        queryClient.invalidateQueries({ queryKey: AUTH_PERMISSIONS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['my-earnings'] }),
      ])
      toast.success('Настройки организации сохранены')
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось сохранить настройки организации')),
  })
}
