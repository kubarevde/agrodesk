import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { dashboardStatsFromApi } from '@/lib/transformers'
import { useCurrentUser } from '@/features/auth/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function useDashboardStats() {
  const isOnline = useOnlineStatus()
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>('/api/dashboard/stats')
      return dashboardStatsFromApi(data)
    },
    refetchInterval: isOnline ? 60_000 : false,
    networkMode: 'offlineFirst',
    retry: isOnline ? 1 : 0,
  })
}

export function useIsAdmin() {
  const { data: user } = useCurrentUser()
  return user?.role === 'admin' || user?.role === 'manager'
}
