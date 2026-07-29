import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/apiError'
import { AUTH_PERMISSIONS_QUERY_KEY } from '@/features/auth/utils'
import { toast } from 'sonner'

export type AccessGroupMember = {
  id: string
  full_name: string
  employee_code: string
  role: string
}

export type AccessGroup = {
  id: string
  name: string
  code: string | null
  is_system: boolean
  sections: string[]
  actions: string[]
  member_count: number
  members: AccessGroupMember[]
}

export type AccessGroupCatalog = {
  sections: Array<{ key: string; label: string }>
  actions: Array<{ key: string; label: string }>
  groups: AccessGroup[]
}

export type AccessGroupPayload = {
  name: string
  sections: string[]
  actions: string[]
  member_ids: string[]
}

export function useAccessGroups(enabled = true) {
  return useQuery({
    queryKey: ['settings', 'access-groups'],
    queryFn: async (): Promise<AccessGroupCatalog> => {
      const { data } = await api.get<AccessGroupCatalog>('/api/settings/access-groups')
      return data
    },
    enabled,
  })
}

function invalidateAccess(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['settings', 'access-groups'] }),
    qc.invalidateQueries({ queryKey: AUTH_PERMISSIONS_QUERY_KEY }),
  ])
}

export function useCreateAccessGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AccessGroupPayload) => {
      const { data } = await api.post<AccessGroup>('/api/settings/access-groups', payload)
      return data
    },
    onSuccess: async () => {
      await invalidateAccess(qc)
      toast.success('Группа создана. Назначенным сотрудникам обновите страницу.')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось создать группу')),
  })
}

export function useUpdateAccessGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: Partial<AccessGroupPayload> & { id: string }) => {
      const { data } = await api.patch<AccessGroup>(`/api/settings/access-groups/${id}`, payload)
      return data
    },
    onSuccess: async () => {
      await invalidateAccess(qc)
      toast.success('Группа обновлена. Назначенным сотрудникам обновите страницу.')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось обновить группу')),
  })
}

export function useDeleteAccessGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/settings/access-groups/${id}`)
    },
    onSuccess: async () => {
      await invalidateAccess(qc)
      toast.success('Группа удалена')
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Не удалось удалить группу')),
  })
}
