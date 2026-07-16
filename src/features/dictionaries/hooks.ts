import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'

export type DictionaryType =
  | 'crop'
  | 'implement_category'
  | 'inventory_category'
  | 'expense_category'

export type DictionaryItem = {
  id: string
  type: DictionaryType
  name: string
  code: string
  is_active: boolean
  sort_order: number
}

const LABELS: Record<DictionaryType, string> = {
  crop: 'Культуры',
  implement_category: 'Категории приспособлений',
  inventory_category: 'Категории ТМЦ',
  expense_category: 'Категории затрат',
}

export function dictionaryTypeLabel(type: DictionaryType): string {
  return LABELS[type]
}

function mapItem(raw: Record<string, unknown>): DictionaryItem {
  return {
    id: String(raw.id),
    type: raw.type as DictionaryType,
    name: String(raw.name ?? ''),
    code: String(raw.code ?? ''),
    is_active: raw.is_active !== false,
    sort_order: Number(raw.sort_order ?? 0),
  }
}

export function useDictionary(
  type: DictionaryType,
  options?: { activeOnly?: boolean; enabled?: boolean },
) {
  const activeOnly = options?.activeOnly ?? true
  return useQuery({
    queryKey: ['dictionaries', type, activeOnly ? 'active' : 'all'],
    enabled: options?.enabled !== false,
    queryFn: async (): Promise<DictionaryItem[]> => {
      const { data } = await api.get<Record<string, unknown>[]>(`/api/dictionaries/${type}`, {
        params: activeOnly ? { is_active: true } : undefined,
      })
      return data.map(mapItem)
    },
  })
}

export function useCreateDictionaryItem(type: DictionaryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data } = await api.post<Record<string, unknown>>(`/api/dictionaries/${type}`, payload)
      return mapItem(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dictionaries', type] })
      toast.success('Добавлено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось добавить')),
  })
}

export function useUpdateDictionaryItem(type: DictionaryType) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      name?: string
      is_active?: boolean
    }) => {
      const { id, ...body } = payload
      const { data } = await api.patch<Record<string, unknown>>(
        `/api/dictionaries/${type}/${id}`,
        body,
      )
      return mapItem(data)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dictionaries', type] })
      toast.success('Сохранено')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось сохранить')),
  })
}
