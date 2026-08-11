import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import type {
  FieldPlanting,
  FieldPlantingWrite,
  FieldPlantingsSummary,
  PlantingStatus,
} from './plantingTypes'
import { normalizePlantingMapColor } from './plantingColors'

function mapPlanting(raw: Record<string, unknown>): FieldPlanting {
  return {
    id: String(raw.id),
    fieldId: String(raw.field_id),
    cropCode: String(raw.crop_code ?? ''),
    cropName: raw.crop_name != null ? String(raw.crop_name) : null,
    varietyId: raw.variety_id != null ? String(raw.variety_id) : null,
    varietyName: raw.variety_name != null ? String(raw.variety_name) : null,
    areaHa: Number(raw.area_ha ?? 0),
    plantedAt: raw.planted_at != null ? String(raw.planted_at) : null,
    harvestedAt: raw.harvested_at != null ? String(raw.harvested_at) : null,
    status: String(raw.status ?? 'planted') as PlantingStatus,
    seasonYear: Number(raw.season_year),
    comment: raw.comment != null ? String(raw.comment) : null,
    polygon: Array.isArray(raw.polygon) ? (raw.polygon as number[][]) : null,
    mapColor: normalizePlantingMapColor(
      raw.map_color != null ? String(raw.map_color) : null,
    ),
    harvestedQty: raw.harvested_qty == null ? null : Number(raw.harvested_qty),
    yieldKgPerHa: raw.yield_kg_per_ha == null ? null : Number(raw.yield_kg_per_ha),
    hasHarvest: Boolean(raw.has_harvest),
    cropLocked: Boolean(raw.crop_locked),
    requestedQty: raw.requested_qty == null ? null : Number(raw.requested_qty),
    shippedQty: raw.shipped_qty == null ? null : Number(raw.shipped_qty),
  }
}

function mapSummary(raw: Record<string, unknown>): FieldPlantingsSummary {
  return {
    fieldId: String(raw.field_id),
    fieldAreaHa: raw.field_area_ha == null ? null : Number(raw.field_area_ha),
    seasonYear: Number(raw.season_year),
    allocatedHa: Number(raw.allocated_ha ?? 0),
    remainingHa: raw.remaining_ha == null ? null : Number(raw.remaining_ha),
    legacyCropCode: raw.legacy_crop_code != null ? String(raw.legacy_crop_code) : null,
    legacyCropType: raw.legacy_crop_type != null ? String(raw.legacy_crop_type) : null,
    legacyNote: raw.legacy_note != null ? String(raw.legacy_note) : null,
  }
}

export function useFieldPlantings(
  fieldId: string | null | undefined,
  options?: {
    seasonYear?: number
    includeCancelled?: boolean
    includeHarvest?: boolean
    enabled?: boolean
  },
) {
  const seasonYear = options?.seasonYear
  const includeCancelled = options?.includeCancelled ?? false
  const includeHarvest = options?.includeHarvest ?? true
  return useQuery({
    queryKey: [
      'field-plantings',
      fieldId,
      seasonYear ?? 'all',
      includeCancelled,
      includeHarvest ? 'harvest' : 'light',
    ],
    enabled: Boolean(fieldId) && options?.enabled !== false,
    queryFn: async (): Promise<FieldPlanting[]> => {
      const { data } = await api.get<Record<string, unknown>[]>(
        `/api/fields/${fieldId}/plantings`,
        {
          params: {
            ...(seasonYear != null ? { season_year: seasonYear } : {}),
            include_cancelled: includeCancelled,
            include_harvest: includeHarvest,
          },
        },
      )
      if (!Array.isArray(data)) throw new Error('Некорректный ответ посевов')
      return data.map(mapPlanting)
    },
  })
}

export function useFieldPlantingsSummary(
  fieldId: string | null | undefined,
  seasonYear?: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['field-plantings-summary', fieldId, seasonYear ?? 'current'],
    enabled: Boolean(fieldId) && options?.enabled !== false,
    queryFn: async (): Promise<FieldPlantingsSummary> => {
      const { data } = await api.get<Record<string, unknown>>(
        `/api/fields/${fieldId}/plantings/summary`,
        { params: seasonYear != null ? { season_year: seasonYear } : undefined },
      )
      return mapSummary(data)
    },
  })
}

export function useCreateFieldPlanting(fieldId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: FieldPlantingWrite) => {
      const { data } = await api.post<Record<string, unknown>>(
        `/api/fields/${fieldId}/plantings`,
        payload,
      )
      return mapPlanting(data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['field-plantings', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-plantings-summary', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-rotation', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['fields-season-plantings'] }),
      ])
      toast.success('Культура добавлена на поле')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить культуру')),
  })
}

export function useUpdateFieldPlanting(fieldId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<FieldPlantingWrite> & { id: string; clear_variety?: boolean }) => {
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/fields/${fieldId}/plantings/${id}`,
        payload,
      )
      return mapPlanting(data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['field-plantings', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-plantings-summary', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['field-rotation', fieldId] }),
        queryClient.invalidateQueries({ queryKey: ['fields-season-plantings'] }),
      ])
      toast.success('Сохранено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось сохранить посев')),
  })
}
