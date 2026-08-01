import { useEffect, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import axios from 'axios'
import { applyAuthSession } from '@/features/auth/applySession'
import { useCurrentUser } from '@/features/auth/hooks'
import { AUTH_PERMISSIONS_QUERY_KEY, resolveHomeRoute } from '@/features/auth/utils'
import { currentUserFromApi } from '@/lib/transformers'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasAction } from '@/lib/permissionActions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  fetchHoldingChildren,
  fetchHoldingOverview,
  postHoldingSwitch,
  postHoldingSwitchBack,
} from './api'
import {
  getHoldingContext,
  reconcileHoldingContextFromToken,
  subscribeHoldingContext,
} from './context'

export function useHoldingContext() {
  useEffect(() => {
    reconcileHoldingContextFromToken()
  }, [])
  return useSyncExternalStore(subscribeHoldingContext, getHoldingContext, () => null)
}

export function useCanViewHolding(): boolean {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions(Boolean(user))
  return hasAction(perms?.actions, 'holding.view', user?.role ?? perms?.role)
}

export function useCanSwitchHolding(): boolean {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions(Boolean(user))
  const holding = useHoldingContext()
  // In child drill-in, hide switch CTA (use switch-back banner instead).
  if (holding) return false
  return hasAction(perms?.actions, 'holding.switch', user?.role ?? perms?.role)
}

export function useHoldingOverview(enabled: boolean) {
  const isOnline = useOnlineStatus()
  return useQuery({
    queryKey: ['holding', 'overview'],
    queryFn: fetchHoldingOverview,
    enabled: enabled && isOnline,
    staleTime: 30_000,
    refetchInterval: isOnline ? 60_000 : false,
    retry: false,
  })
}

/** Children list for holding report scope (head session only). */
export function useHoldingChildren(enabled: boolean) {
  const isOnline = useOnlineStatus()
  const holding = useHoldingContext()
  return useQuery({
    queryKey: ['holding', 'children'],
    queryFn: fetchHoldingChildren,
    enabled: enabled && isOnline && !holding,
    staleTime: 60_000,
    retry: false,
  })
}

function switchErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

export function useHoldingSwitch() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (child: { orgId: string; name: string; slug: string }) =>
      postHoldingSwitch(child.orgId).then((data) => ({ data, child })),
    onSuccess: async ({ data, child }) => {
      if (!data.head_org_id || !data.head_org_name) {
        toast.error('Некорректный ответ переключения')
        return
      }
      await applyAuthSession(queryClient, data, {
        selectedOrg: {
          id: data.current_org_id,
          name: data.current_org_name,
          slug: child.slug,
        },
        holdingContext: {
          headOrgId: data.head_org_id,
          headOrgName: data.head_org_name,
          childOrgId: data.current_org_id,
          childOrgName: data.current_org_name,
        },
      })
      const user = currentUserFromApi(data.employee)
      const perms = queryClient.getQueryData<{ allowedSections: string[] }>(
        AUTH_PERMISSIONS_QUERY_KEY,
      )
      toast.success(`Открыто КФХ «${data.current_org_name}»`)
      void navigate({
        to: resolveHomeRoute(user.role, perms?.allowedSections ?? []),
      })
    },
    onError: (error) => {
      toast.error(switchErrorMessage(error, 'Не удалось открыть КФХ'))
    },
  })
}

export function useHoldingSwitchBack() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: postHoldingSwitchBack,
    onSuccess: async (data) => {
      await applyAuthSession(queryClient, data, {
        selectedOrg: {
          id: data.current_org_id,
          name: data.current_org_name,
          slug: 'head',
        },
        holdingContext: null,
      })
      const user = currentUserFromApi(data.employee)
      const perms = queryClient.getQueryData<{ allowedSections: string[] }>(
        AUTH_PERMISSIONS_QUERY_KEY,
      )
      toast.success(`Возврат в «${data.current_org_name}»`)
      void navigate({
        to: resolveHomeRoute(user.role, perms?.allowedSections ?? []),
      })
    },
    onError: (error) => {
      toast.error(switchErrorMessage(error, 'Не удалось вернуться в головную'))
    },
  })
}
