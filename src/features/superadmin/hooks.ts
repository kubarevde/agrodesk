import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  attachOrgChild,
  createOrganization,
  deleteOrganization,
  detachOrgChild,
  fetchOrgChildren,
  fetchOrgChildrenAvailable,
  fetchOrgParent,
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
  children: (headOrgId: string) =>
    ['superadmin', 'organizations', headOrgId, 'children'] as const,
  childrenAvailable: (headOrgId: string) =>
    ['superadmin', 'organizations', headOrgId, 'children-available'] as const,
  parent: (orgId: string) =>
    ['superadmin', 'organizations', orgId, 'parent'] as const,
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

export function useOrgChildren(headOrgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: orgKeys.children(headOrgId ?? ''),
    queryFn: () => {
      if (!headOrgId) {
        throw new Error('headOrgId is required')
      }
      return fetchOrgChildren(headOrgId)
    },
    enabled: Boolean(headOrgId) && enabled,
  })
}

export function useOrgChildrenAvailable(headOrgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: orgKeys.childrenAvailable(headOrgId ?? ''),
    queryFn: () => {
      if (!headOrgId) {
        throw new Error('headOrgId is required')
      }
      return fetchOrgChildrenAvailable(headOrgId)
    },
    enabled: Boolean(headOrgId) && enabled,
  })
}

export function useOrgParent(orgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: orgKeys.parent(orgId ?? ''),
    queryFn: () => {
      if (!orgId) {
        throw new Error('orgId is required')
      }
      return fetchOrgParent(orgId)
    },
    enabled: Boolean(orgId) && enabled,
  })
}

export function useAttachOrgChild(headOrgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (childOrgId: string) => attachOrgChild(headOrgId, childOrgId),
    onSuccess: async (_data, childOrgId) => {
      await queryClient.invalidateQueries({ queryKey: orgKeys.children(headOrgId) })
      await queryClient.invalidateQueries({
        queryKey: orgKeys.childrenAvailable(headOrgId),
      })
      await queryClient.invalidateQueries({ queryKey: orgKeys.parent(childOrgId) })
    },
  })
}

export function useDetachOrgChild(headOrgId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (childOrgId: string) => detachOrgChild(headOrgId, childOrgId),
    onSuccess: async (_data, childOrgId) => {
      await queryClient.invalidateQueries({ queryKey: orgKeys.children(headOrgId) })
      await queryClient.invalidateQueries({
        queryKey: orgKeys.childrenAvailable(headOrgId),
      })
      await queryClient.invalidateQueries({ queryKey: orgKeys.parent(childOrgId) })
    },
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
