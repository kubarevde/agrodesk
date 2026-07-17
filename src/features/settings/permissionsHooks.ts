import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { toast } from 'sonner'

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
        qc.invalidateQueries({ queryKey: ['auth', 'permissions'] }),
      ])
      toast.success('Права доступа сохранены')
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Не удалось сохранить права доступа')),
  })
}

export function useUserPermissions(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'permissions'],
    queryFn: async () => {
      const { data } = await api.get<{ role: string; allowed_sections: string[] }>(
        '/api/auth/permissions',
      )
      return {
        role: data.role as 'admin' | 'manager' | 'employee',
        allowedSections: data.allowed_sections ?? [],
      }
    },
    enabled,
    staleTime: 60_000,
  })
}
