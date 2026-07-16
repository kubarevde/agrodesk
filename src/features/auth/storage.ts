import type { CurrentUser } from '@/lib/transformers'

export const TOKEN_KEY = 'agrodesk_token'
export const USER_CACHE_KEY = 'agrodesk_user_cache'

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
}

export function getLoginHref(): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${normalized}login`
}
