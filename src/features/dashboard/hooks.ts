import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { dashboardStatsFromApi } from '@/lib/transformers'
import { useCurrentUser } from '@/features/auth/hooks'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>('/api/dashboard/stats')
      return dashboardStatsFromApi(data)
    },
    refetchInterval: 60_000,
  })
}

export function useIsAdmin() {
  const { data: user } = useCurrentUser()
  return user?.role === 'admin' || user?.role === 'manager'
}
