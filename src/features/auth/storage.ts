import type { CurrentUser } from '@/lib/transformers'

export const TOKEN_KEY = 'agrodesk_token'
export const USER_CACHE_KEY = 'agrodesk_user_cache'
const ALLOWED_SECTIONS_CACHE_KEY = 'agrodesk_allowed_sections_cache'
const PERMISSIONS_CACHE_KEY = 'agrodesk_permissions_cache'

export type AllowedSectionsCache = {
  userId: string
  role: CurrentUser['role']
  allowedSections: string[]
  cachedAt: number
}

export type PermissionsCache = {
  userId: string
  role: CurrentUser['role']
  allowedSections: string[]
  actions: string[]
  cachedAt: number
}

/** Decode JWT payload `sub` without verifying signature (client identity binding only). */
export function readAccessTokenSubject(token: string | null | undefined): string | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    if (parts.length < 2 || !parts[1]) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const json = atob(b64 + pad)
    const data = JSON.parse(json) as { sub?: unknown }
    return typeof data.sub === 'string' && data.sub.length > 0 ? data.sub : null
  } catch {
    return null
  }
}

export function cacheCurrentUser(user: CurrentUser): void {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
}

/**
 * Cached profile for the current access token.
 * Rejects stale EMP001-style cache when the JWT `sub` belongs to another employee.
 */
export function readCachedCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CurrentUser
    if (!parsed?.id || !parsed?.role) return null

    const token = localStorage.getItem(TOKEN_KEY)
    const sub = readAccessTokenSubject(token)
    if (sub && parsed.id !== sub) return null

    return parsed
  } catch {
    return null
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_CACHE_KEY)
  localStorage.removeItem(ALLOWED_SECTIONS_CACHE_KEY)
  localStorage.removeItem(PERMISSIONS_CACHE_KEY)
}

export function getLoginHref(): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}login`
}

export function cacheAllowedSections(
  userId: string,
  role: CurrentUser['role'],
  allowedSections: string[],
) {
  const payload: AllowedSectionsCache = {
    userId,
    role,
    allowedSections,
    cachedAt: Date.now(),
  }
  localStorage.setItem(ALLOWED_SECTIONS_CACHE_KEY, JSON.stringify(payload))
}

export function readCachedAllowedSections(
  userId: string,
  role: CurrentUser['role'],
): string[] | null {
  try {
    const raw = localStorage.getItem(ALLOWED_SECTIONS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AllowedSectionsCache>
    if (parsed.userId && parsed.userId !== userId) return null
    // Legacy caches without userId: only trust when role matches (best-effort).
    if (!parsed.userId && parsed.role !== role) return null
    if (parsed.userId && parsed.role !== role) return null
    if (!Array.isArray(parsed.allowedSections)) return null
    return parsed.allowedSections.filter((s): s is string => typeof s === 'string')
  } catch {
    return null
  }
}

/** Persist Level-1 + Level-2 grants for offline shift open / section guards. */
export function cacheUserPermissions(
  userId: string,
  role: CurrentUser['role'],
  allowedSections: string[],
  actions: string[],
): void {
  const payload: PermissionsCache = {
    userId,
    role,
    allowedSections,
    actions,
    cachedAt: Date.now(),
  }
  localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(payload))
  cacheAllowedSections(userId, role, allowedSections)
}

export function readCachedUserPermissions(
  userId: string,
  role: CurrentUser['role'],
): { allowedSections: string[]; actions: string[] } | null {
  try {
    const raw = localStorage.getItem(PERMISSIONS_CACHE_KEY)
    if (!raw) {
      const sections = readCachedAllowedSections(userId, role)
      return sections ? { allowedSections: sections, actions: [] } : null
    }
    const parsed = JSON.parse(raw) as Partial<PermissionsCache>
    if (parsed.userId && parsed.userId !== userId) return null
    if (!parsed.userId && parsed.role !== role) return null
    if (parsed.userId && parsed.role !== role) return null
    if (!Array.isArray(parsed.allowedSections) || !Array.isArray(parsed.actions)) return null
    return {
      allowedSections: parsed.allowedSections.filter((s): s is string => typeof s === 'string'),
      actions: parsed.actions.filter((a): a is string => typeof a === 'string'),
    }
  } catch {
    return null
  }
}
