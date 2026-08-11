import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Field } from '@/types'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { db } from '@/lib/db'
import { displayDateToIso, inventoryOperationFromApi } from '@/lib/transformers'
import type { FieldFormValues } from './schemas'
import { mapSeasonPlantingOverlay } from './seasonPlantingTypes'

function toPayload(values: FieldFormValues) {
  const polygon =
    values.polygon && values.polygon.length >= 3
      ? values.polygon.map((pair) => [Number(pair[0]), Number(pair[1])])
      : []

  const lat = typeof values.latitude === 'number' && Number.isFinite(values.latitude)
    ? values.latitude
    : null
  const lng = typeof values.longitude === 'number' && Number.isFinite(values.longitude)
    ? values.longitude
    : null
  const area =
    typeof values.area_ha === 'number' && Number.isFinite(values.area_ha) ? values.area_ha : null

  return {
    name: values.name.trim(),
    area_ha: area,
    description: values.description || null,
    latitude: lat,
    longitude: lng,
    polygon,
  }
}

export function useFields() {
  return useQuery({
    queryKey: ['fields', { is_active: true }],
    networkMode: 'offlineFirst',
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await db.fields.toArray()
        return cached.filter((field) => field.is_active)
      }

      const { data } = await api.get<Field[]>('/api/fields', {
        params: { is_active: true },
      })
      const normalized = data.map((field) => ({
        ...field,
        crop_code: field.crop_code ?? null,
      }))
      await db.fields.bulkPut(normalized)
      return normalized
    },
  })
}

export function useFieldDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['fields', id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!navigator.onLine && id) {
        const cached = await db.fields.get(id)
        if (cached) return cached
      }

      const { data } = await api.get<Field>(`/api/fields/${id}`)
      await db.fields.put(data)
      return data
    },
  })
}

export function useSeasonPlantingOverlays(seasonYear?: number, options?: { enabled?: boolean }) {
  const year = seasonYear ?? new Date().getFullYear()
  return useQuery({
    queryKey: ['fields-season-plantings', year],
    enabled: options?.enabled !== false,
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/fields/season-plantings', {
        params: { season_year: year },
      })
      return (Array.isArray(data) ? data : []).map(mapSeasonPlantingOverlay)
    },
  })
}

export function useCreateField() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: FieldFormValues) => {
      const { data } = await api.post<Field>('/api/fields', toPayload(values))
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fields'] })
      toast.success('Поле создано. Добавьте культуру / посев на карточке поля.')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить поле')),
  })
}

export function useUpdateField() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FieldFormValues }) => {
      const { data } = await api.patch<Field>(`/api/fields/${id}`, toPayload(values))
      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fields'] })
      toast.success('Поле обновлено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить поле')),
  })
}

export function useDeleteField() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/fields/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fields'] })
      toast.success('Поле удалено')
    },
    onError: () => toast.error('Не удалось удалить поле'),
  })
}

export function useFieldHarvest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      fieldId: string
      inventoryItemId: string
      quantity: number
      date: string
      fieldPlantingId?: string
      harvestStatus?: 'partially_harvested' | 'harvested'
    }) => {
      const { data } = await api.post<Record<string, unknown>>(
        `/api/fields/${payload.fieldId}/harvest`,
        {
          inventory_item_id: payload.inventoryItemId,
          quantity: payload.quantity,
          date: displayDateToIso(payload.date),
          ...(payload.fieldPlantingId
            ? { field_planting_id: payload.fieldPlantingId }
            : {}),
          ...(payload.harvestStatus ? { harvest_status: payload.harvestStatus } : {}),
        },
      )
      return inventoryOperationFromApi(data)
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['field-plantings', vars.fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-plantings-summary', vars.fieldId] }),
      ])
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось оприходовать урожай')),
  })
}
