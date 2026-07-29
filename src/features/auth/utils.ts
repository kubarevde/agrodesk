import axios from 'axios'
import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { api } from '@/lib/api'
import { currentUserFromApi, type CurrentUser } from '@/lib/transformers'
import {
  canAccessPath,
  NO_ACCESS_ROUTE,
  resolveHomeRoute,
  SECTION_ROUTE_MAP,
} from '@/lib/permissions'
import { DEFAULT_EMPLOYEE_SECTIONS } from '@/lib/sectionRegistry'
import {
  cacheCurrentUser,
  cacheUserPermissions,
  clearAuthStorage,
  readCachedAllowedSections,
  readCachedCurrentUser,
  readCachedUserPermissions,
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

export { resolveHomeRoute, NO_ACCESS_ROUTE } from '@/lib/permissions'

export const AUTH_PERMISSIONS_QUERY_KEY = ['auth', 'permissions'] as const

export type UserPermissionsData = {
  role: CurrentUser['role']
  allowedSections: string[]
  actions: string[]
  accessGroupId: string | null
  accessGroupName: string | null
}

/** Resolve home using role + current grants (async). */
export async function resolveUserHomeRoute(queryClient: QueryClient): Promise<string> {
  const user = await resolveCurrentUser(queryClient)
  if (user.role === 'admin') return '/dashboard'
  const sections = await fetchAllowedSections(queryClient)
  return resolveHomeRoute(user.role, sections)
}

/**
 * @deprecated Prefer resolveUserHomeRoute / resolveHomeRoute(role, sections).
 * Kept for call sites that only know the role; uses safe role defaults.
 */
export function getHomeRoute(role: CurrentUser['role']): string {
  return resolveHomeRoute(role, undefined)
}

/** True when the failure is offline / network / server — not an invalid session. */
export function isRecoverableAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true
  const status = error.response?.status
  if (status === 401 || status === 403) return false
  if (!error.response) return true
  return (status ?? 0) >= 500
}

export function normalizePermissionsQueryData(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.filter((s): s is string => typeof s === 'string')
  }
  if (data && typeof data === 'object' && 'allowedSections' in data) {
    const sections = (data as UserPermissionsData).allowedSections
    return Array.isArray(sections)
      ? sections.filter((s): s is string => typeof s === 'string')
      : []
  }
  return []
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await api.get<Record<string, unknown>>('/api/auth/me')
  const user = currentUserFromApi(data)
  cacheCurrentUser(user)
  return user
}

/**
 * Single source for /api/auth/permissions.
 * Always returns { role, allowedSections } so React Query cache shape stays stable
 * across route guards and SidebarNav.
 */
export async function fetchUserPermissions(): Promise<UserPermissionsData> {
  const { data } = await api.get<{
    role: string
    allowed_sections: string[]
    actions?: string[]
    access_group_id?: string | null
    access_group_name?: string | null
  }>('/api/auth/permissions')
  const result: UserPermissionsData = {
    role: data.role as CurrentUser['role'],
    allowedSections: data.allowed_sections ?? [],
    actions: data.actions ?? [],
    accessGroupId: data.access_group_id ?? null,
    accessGroupName: data.access_group_name ?? null,
  }
  if (result.role === 'manager' || result.role === 'employee' || result.role === 'admin') {
    cacheUserPermissions(result.role, result.allowedSections, result.actions)
  }
  return result
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
  const cachedUser = readCachedCurrentUser()
  const cachedRole = cachedUser?.role

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (cachedRole === 'admin') {
      return Object.keys(SECTION_ROUTE_MAP)
    }

    const cachedPerms = cachedRole ? readCachedUserPermissions(cachedRole) : null
    if (cachedRole && cachedPerms) {
      queryClient.setQueryData(AUTH_PERMISSIONS_QUERY_KEY, {
        role: cachedRole,
        allowedSections: cachedPerms.allowedSections,
        actions: cachedPerms.actions,
        accessGroupId: null,
        accessGroupName: null,
      } satisfies UserPermissionsData)
      return cachedPerms.allowedSections
    }

    if (cachedRole === 'employee') {
      return readCachedAllowedSections('employee') ?? [...DEFAULT_EMPLOYEE_SECTIONS]
    }

    if (cachedRole === 'manager') {
      return readCachedAllowedSections('manager') ?? Object.keys(SECTION_ROUTE_MAP)
    }

    return []
  }

  const data = await queryClient.fetchQuery({
    queryKey: AUTH_PERMISSIONS_QUERY_KEY,
    queryFn: fetchUserPermissions,
    staleTime: 10_000,
  })

  const sections = normalizePermissionsQueryData(data)

  return sections
}

/** Route guard: redirect if current role cannot access section. */
export async function guardSectionAccess(
  queryClient: QueryClient,
  section: string,
  fallback?: string,
): Promise<CurrentUser> {
  const user = await resolveCurrentUser(queryClient)
  if (user.role === 'admin') return user
  const allowed = await fetchAllowedSections(queryClient)
  if (!allowed.includes(section)) {
    const home = fallback ?? resolveHomeRoute(user.role, allowed)
    const homeSection = Object.entries(SECTION_ROUTE_MAP).find(([, route]) => route === home)?.[0]
    if (!home || homeSection === section) {
      throw redirect({ to: NO_ACCESS_ROUTE })
    }
    throw redirect({ to: home })
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
