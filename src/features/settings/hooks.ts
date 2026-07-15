import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Equipment, InventoryItem, Location, WorkType } from '@/types'
import { api } from '@/lib/api'
import {
  equipmentFromApi,
  inventoryItemFromApi,
  locationFromApi,
  workTypeFromApi,
} from '@/lib/transformers'
import type {
  EquipmentFormValues,
  InventoryItemFormValues,
  LocationFormValues,
  WorkTypeFormValues,
} from './schemas'

async function invalidateReferences(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['locations'] }),
    queryClient.invalidateQueries({ queryKey: ['work-types'] }),
    queryClient.invalidateQueries({ queryKey: ['equipment'] }),
    queryClient.invalidateQueries({ queryKey: ['inventory'] }),
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

export function useSettingsEquipment() {
  return useQuery({
    queryKey: ['equipment', 'settings'],
    queryFn: async (): Promise<Equipment[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/equipment')
      return data.map(equipmentFromApi)
    },
  })
}

export function useSettingsInventoryItems() {
  return useQuery({
    queryKey: ['inventory', 'settings'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/inventory')
      return data.map(inventoryItemFromApi)
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
    onError: () => toast.error('Не удалось добавить объект'),
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
    onError: () => toast.error('Не удалось обновить объект'),
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
    onError: () => toast.error('Не удалось добавить тип работ'),
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
    onError: () => toast.error('Не удалось обновить тип работ'),
  })
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: EquipmentFormValues) => {
      const { data } = await api.post<Record<string, unknown>>('/api/equipment', {
        name: payload.name,
        type: payload.type || undefined,
      })
      const created = equipmentFromApi(data)
      if (payload.isActive === false) {
        const { data: updated } = await api.patch<Record<string, unknown>>(
          `/api/equipment/${created.id}`,
          { is_active: false },
        )
        return equipmentFromApi(updated)
      }
      return created
    },
    onSuccess: async () => {
      await invalidateReferences(queryClient)
      toast.success('Техника добавлена')
    },
    onError: () => toast.error('Не удалось добавить технику'),
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<EquipmentFormValues>) => {
      const { data } = await api.patch<Record<string, unknown>>(`/api/equipment/${id}`, {
        name: payload.name,
        type: payload.type,
        is_active: payload.isActive,
      })
      return equipmentFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await invalidateReferences(queryClient)
      if (variables.isActive === false) toast.success('Техника деактивирована')
      else if (variables.isActive === true) toast.success('Техника активирована')
      else toast.success('Техника обновлена')
    },
    onError: () => toast.error('Не удалось обновить технику'),
  })
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: InventoryItemFormValues) => {
      const { data } = await api.post<Record<string, unknown>>('/api/inventory', {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        current_stock: payload.currentStock,
        min_stock: payload.minStock,
        total_capacity: payload.totalCapacity,
      })
      const created = inventoryItemFromApi(data)
      if (payload.isActive === false) {
        const { data: updated } = await api.patch<Record<string, unknown>>(
          `/api/inventory/${created.id}`,
          { is_active: false },
        )
        return inventoryItemFromApi(updated)
      }
      return created
    },
    onSuccess: async () => {
      await invalidateReferences(queryClient)
      toast.success('Позиция ТМЦ добавлена')
    },
    onError: () => toast.error('Не удалось добавить позицию'),
  })
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: { id: string } & Partial<InventoryItemFormValues>) => {
      const { data } = await api.patch<Record<string, unknown>>(`/api/inventory/${id}`, {
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        min_stock: payload.minStock,
        total_capacity: payload.totalCapacity,
        is_active: payload.isActive,
      })
      return inventoryItemFromApi(data)
    },
    onSuccess: async (_data, variables) => {
      await invalidateReferences(queryClient)
      if (variables.isActive === false) toast.success('Позиция деактивирована')
      else if (variables.isActive === true) toast.success('Позиция активирована')
      else toast.success('Позиция обновлена')
    },
    onError: () => toast.error('Не удалось обновить позицию'),
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
    onError: () => toast.error('Не удалось сохранить часовой пояс'),
  })
}
