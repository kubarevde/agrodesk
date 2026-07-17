import { useQuery } from '@tanstack/react-query'
import { fetchForecast, fetchRecommendations } from './api'

export function useForecast(method = 'auto', monthsAhead = 1) {
  return useQuery({
    queryKey: ['analytics', 'forecast', method, monthsAhead],
    queryFn: () => fetchForecast({ method, monthsAhead }),
  })
}

export function useRecommendations() {
  return useQuery({
    queryKey: ['analytics', 'recommendations'],
    queryFn: fetchRecommendations,
  })
}
