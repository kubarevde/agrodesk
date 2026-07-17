import axios from 'axios'
import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { currentUserFromApi, type CurrentUser } from '@/lib/transformers'
import { canAccessPath } from '@/lib/permissions'
import {
  cacheCurrentUser,
  clearAuthStorage,
  readCachedCurrentUser,
  TOKEN_KEY,
} from '@/features/auth/storage'

export {
  TOKEN_KEY,
  USER_CACHE_KEY,
  cacheCurrentUser,
  clearAuthStorage,
  getLoginHref,
  readCachedCurrentUser,
} from '@/features/auth/storage'

export function getHomeRoute(role: CurrentUser['role']): '/dashboard' | '/my-shift' {
  return role === 'employee' ? '/my-shift' : '/dashboard'
}

/** True when the failure is offline / network / server — not an invalid session. */
export function isRecoverableAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true
  const status = error.response?.status
  if (status === 401 || status === 403) return false
  if (!error.response) return true
  return (status ?? 0) >= 500
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<Record<string, unknown>>('/api/auth/me')
  const user = currentUserFromApi(data)
  cacheCurrentUser(user)
  return user
}

/**
 * Bootstrap auth for route guards.
 * Offline: use cached profile immediately (no /me round-trip).
 * Online: refresh from API; on network/5xx keep session via cache.
 * 401/403: clear session.
 */
export async function resolveCurrentUser(queryClient: QueryClient): Promise<CurrentUser> {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    throw new Error('NO_TOKEN')
  }

  // Avoid hanging on /me when the device is already offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = readCachedCurrentUser()
    if (cached) {
      queryClient.setQueryData(['auth', 'me'], cached)
      return cached
    }
    throw new Error('OFFLINE_NO_USER_CACHE')
  }

  try {
    return await queryClient.fetchQuery({
      queryKey: ['auth', 'me'],
      queryFn: fetchCurrentUser,
      staleTime: 60_000,
    })
  } catch (error) {
    if (!isRecoverableAuthFailure(error)) {
      clearAuthStorage()
      queryClient.removeQueries({ queryKey: ['auth', 'me'] })
      throw error
    }

    const cached = readCachedCurrentUser()
    if (cached) {
      queryClient.setQueryData(['auth', 'me'], cached)
      return cached
    }

    throw error
  }
}

export async function fetchAllowedSections(queryClient: QueryClient): Promise<string[]> {
  const data = await queryClient.fetchQuery({
    queryKey: ['auth', 'permissions'],
    queryFn: async () => {
      const { data: raw } = await api.get<{ allowed_sections: string[] }>(
        '/api/auth/permissions',
      )
      return raw.allowed_sections ?? []
    },
    staleTime: 60_000,
  })
  return data
}

/** Route guard: redirect if current role cannot access section. */
export async function guardSectionAccess(
  queryClient: QueryClient,
  section: string,
  fallback?: '/dashboard' | '/my-shift',
): Promise<CurrentUser> {
  const user = await resolveCurrentUser(queryClient)
  if (user.role === 'admin') return user
  const allowed = await fetchAllowedSections(queryClient)
  if (!allowed.includes(section)) {
    throw redirect({ to: fallback ?? getHomeRoute(user.role) })
  }
  return user
}

export function guardPathAccess(
  pathname: string,
  user: CurrentUser,
  allowedSections: string[],
): boolean {
  return canAccessPath(pathname, user.role, allowedSections)
}
