import type { CurrentUser } from '@/lib/transformers'

export const TOKEN_KEY = 'agrodesk_token'
export const USER_CACHE_KEY = 'agrodesk_user_cache'
const ALLOWED_SECTIONS_CACHE_KEY = 'agrodesk_allowed_sections_cache'
const PERMISSIONS_CACHE_KEY = 'agrodesk_permissions_cache'

export type AllowedSectionsCache = {
  role: CurrentUser['role']
  allowedSections: string[]
  cachedAt: number
}

export type PermissionsCache = {
  role: CurrentUser['role']
  allowedSections: string[]
  actions: string[]
  cachedAt: number
}

export function cacheCurrentUser(user: CurrentUser): void {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user))
}

export function readCachedCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CurrentUser
    if (!parsed?.id || !parsed?.role) return null
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

export function cacheAllowedSections(role: CurrentUser['role'], allowedSections: string[]) {
  const payload: AllowedSectionsCache = {
    role,
    allowedSections,
    cachedAt: Date.now(),
  }
  localStorage.setItem(ALLOWED_SECTIONS_CACHE_KEY, JSON.stringify(payload))
}

export function readCachedAllowedSections(
  role: CurrentUser['role'],
): string[] | null {
  try {
    const raw = localStorage.getItem(ALLOWED_SECTIONS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AllowedSectionsCache>
    if (parsed.role !== role) return null
    if (!Array.isArray(parsed.allowedSections)) return null
    return parsed.allowedSections.filter((s): s is string => typeof s === 'string')
  } catch {
    return null
  }
}

/** Persist Level-1 + Level-2 grants for offline shift open / section guards. */
export function cacheUserPermissions(
  role: CurrentUser['role'],
  allowedSections: string[],
  actions: string[],
): void {
  const payload: PermissionsCache = {
    role,
    allowedSections,
    actions,
    cachedAt: Date.now(),
  }
  localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(payload))
  cacheAllowedSections(role, allowedSections)
}

export function readCachedUserPermissions(
  role: CurrentUser['role'],
): { allowedSections: string[]; actions: string[] } | null {
  try {
    const raw = localStorage.getItem(PERMISSIONS_CACHE_KEY)
    if (!raw) {
      const sections = readCachedAllowedSections(role)
      return sections ? { allowedSections: sections, actions: [] } : null
    }
    const parsed = JSON.parse(raw) as Partial<PermissionsCache>
    if (parsed.role !== role) return null
    if (!Array.isArray(parsed.allowedSections) || !Array.isArray(parsed.actions)) return null
    return {
      allowedSections: parsed.allowedSections.filter((s): s is string => typeof s === 'string'),
      actions: parsed.actions.filter((a): a is string => typeof a === 'string'),
    }
  } catch {
    return null
  }
}
