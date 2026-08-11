import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'

export type CropVariety = {
  id: string
  cropCode: string
  name: string
  isActive: boolean
  sortOrder: number
}

export type CropVarietyUsage = {
  fields: number
  inventory: number
  shipments: number
  shipmentRequests: number
  total: number
}

function mapVariety(raw: Record<string, unknown>): CropVariety {
  return {
    id: String(raw.id),
    cropCode: String(raw.crop_code ?? ''),
    name: String(raw.name ?? ''),
    isActive: raw.is_active !== false,
    sortOrder: Number(raw.sort_order ?? 0),
  }
}

function mapUsage(raw: Record<string, unknown>): CropVarietyUsage {
  return {
    fields: Number(raw.fields ?? 0),
    inventory: Number(raw.inventory ?? 0),
    shipments: Number(raw.shipments ?? 0),
    shipmentRequests: Number(raw.shipment_requests ?? 0),
    total: Number(raw.total ?? 0),
  }
}

export function useCropVarieties(
  cropCode: string | null | undefined,
  options?: { activeOnly?: boolean; enabled?: boolean },
) {
  const activeOnly = options?.activeOnly ?? false
  const code = cropCode?.trim() || ''
  return useQuery({
    queryKey: ['crop-varieties', code, activeOnly ? 'active' : 'all'],
    enabled: Boolean(code) && options?.enabled !== false,
    queryFn: async (): Promise<CropVariety[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/crop-varieties', {
        params: {
          crop_code: code,
          ...(activeOnly ? { is_active: true } : {}),
        },
      })
      if (!Array.isArray(data)) {
        throw new Error('Некорректный ответ сортов')
      }
      return data.map(mapVariety)
    },
  })
}

/** All org varieties (for crop list summaries). */
export function useAllCropVarieties(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['crop-varieties', 'all'],
    enabled: options?.enabled !== false,
    queryFn: async (): Promise<CropVariety[]> => {
      const { data } = await api.get<Record<string, unknown>[]>('/api/crop-varieties')
      if (!Array.isArray(data)) {
        throw new Error('Некорректный ответ сортов')
      }
      return data.map(mapVariety)
    },
  })
}

export function groupVarietiesByCropCode(
  varieties: CropVariety[],
): Record<string, CropVariety[]> {
  const map: Record<string, CropVariety[]> = {}
  for (const variety of varieties) {
    const list = map[variety.cropCode] ?? []
    list.push(variety)
    map[variety.cropCode] = list
  }
  return map
}

export function useCreateCropVariety() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { cropCode: string; name: string }) => {
      const { data } = await api.post<Record<string, unknown>>('/api/crop-varieties', {
        crop_code: payload.cropCode,
        name: payload.name,
      })
      return mapVariety(data)
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crop-varieties', vars.cropCode] }),
        queryClient.invalidateQueries({ queryKey: ['crop-varieties', 'all'] }),
      ])
      toast.success('Сорт добавлен')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить сорт')),
  })
}

export function useUpdateCropVariety(cropCode: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      name?: string
      is_active?: boolean
    }) => {
      const { id, ...body } = payload
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/crop-varieties/${id}`,
        body,
      )
      return mapVariety(data)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['crop-varieties', cropCode] }),
        queryClient.invalidateQueries({ queryKey: ['crop-varieties', 'all'] }),
      ])
      toast.success('Сохранено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось сохранить сорт')),
  })
}

export function useCropVarietyUsage(varietyId: string | null) {
  return useQuery({
    queryKey: ['crop-varieties', 'usage', varietyId],
    enabled: Boolean(varietyId),
    queryFn: async (): Promise<CropVarietyUsage> => {
      const { data } = await api.get<Record<string, unknown>>(
        `/api/crop-varieties/${varietyId}/usage`,
      )
      return mapUsage(data)
    },
  })
}
