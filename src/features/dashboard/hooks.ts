import { useQuery } from '@tanstack/react-query'
import type { DashboardStats } from '@/types'
import { api } from '@/lib/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/api/dashboard/stats')
      return data
    },
    refetchInterval: 30_000,
  })
}

/** Mock admin until auth is implemented. */
export function useIsAdmin() {
  return true
}
