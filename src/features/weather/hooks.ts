import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { FieldWeatherDay, FieldWeatherMonth } from './types'

export function useFieldMonthWeather(
  month: string,
  fieldId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['weather', 'month', month, fieldId ?? 'auto'],
    enabled: options?.enabled ?? true,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await api.get<FieldWeatherMonth>('/api/weather/month', {
        params: {
          month,
          ...(fieldId ? { fieldId } : {}),
        },
      })
      return data
    },
  })
}

export function useFieldDayWeather(
  day: string | null | undefined,
  fieldId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['weather', 'day', day, fieldId ?? 'auto'],
    enabled: (options?.enabled ?? true) && Boolean(day),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data } = await api.get<FieldWeatherDay>('/api/weather/day', {
        params: {
          day,
          ...(fieldId ? { fieldId } : {}),
        },
      })
      return data
    },
  })
}
