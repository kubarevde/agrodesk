import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { toast } from 'sonner'
import {
  AUTH_PERMISSIONS_QUERY_KEY,
  fetchUserPermissions,
  type UserPermissionsData,
} from '@/features/auth/utils'

export type SectionInfo = { key: string; label: string }

export type RolePermissionsData = {
  sections: SectionInfo[]
  permissions: Record<string, string[]>
}

export function useRolePermissions(enabled = true) {
  return useQuery({
    queryKey: ['settings', 'role-permissions'],
    queryFn: async (): Promise<RolePermissionsData> => {
      const { data } = await api.get<RolePermissionsData>('/api/settings/role-permissions')
      return data
    },
    enabled,
  })
}

export function useUpdateRolePermissions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (permissions: Record<string, string[]>) => {
      const { data } = await api.patch<RolePermissionsData>(
        '/api/settings/role-permissions',
        { permissions },
      )
      return data
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['settings', 'role-permissions'] }),
        qc.invalidateQueries({ queryKey: AUTH_PERMISSIONS_QUERY_KEY }),
      ])
      toast.success(
        'Права доступа сохранены. Сотрудникам: обновите страницу или войдите заново.',
      )
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось сохранить права доступа')),
  })
}

/** Current user's allowed sections — same cache shape as route guards. */
export function useUserPermissions(enabled = true) {
  return useQuery({
    queryKey: AUTH_PERMISSIONS_QUERY_KEY,
    queryFn: fetchUserPermissions,
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })
}

export type { UserPermissionsData }
