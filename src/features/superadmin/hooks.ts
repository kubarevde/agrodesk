import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  fetchSuperAdminStats,
  loginSuperAdmin,
  updateOrganization,
} from './api'
import { SUPERADMIN_TOKEN_KEY } from './types'
import type { OrganizationCreatePayload, OrganizationUpdatePayload } from './types'

const orgKeys = {
  all: ['superadmin', 'organizations'] as const,
  stats: ['superadmin', 'stats'] as const,
}

export function useSuperAdminLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginSuperAdmin(email, password),
    onSuccess: (token) => {
      localStorage.setItem(SUPERADMIN_TOKEN_KEY, token)
    },
  })
}

export function useOrganizations() {
  return useQuery({
    queryKey: orgKeys.all,
    queryFn: fetchOrganizations,
  })
}

export function useSuperAdminStats() {
  return useQuery({
    queryKey: orgKeys.stats,
    queryFn: fetchSuperAdminStats,
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OrganizationCreatePayload) => createOrganization(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orgKeys.all })
      await queryClient.invalidateQueries({ queryKey: orgKeys.stats })
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OrganizationUpdatePayload }) =>
      updateOrganization(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orgKeys.all })
      await queryClient.invalidateQueries({ queryKey: orgKeys.stats })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOrganization(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orgKeys.all })
      await queryClient.invalidateQueries({ queryKey: orgKeys.stats })
    },
  })
}
