import {
  DEFAULT_EMPLOYEE_SECTIONS,
  SECTION_REGISTRY,
  SECTION_ROUTE_MAP,
  getSectionByKey,
  getSectionByRoute,
} from '@/lib/sectionRegistry'

export { SECTION_ROUTE_MAP, DEFAULT_EMPLOYEE_SECTIONS } from '@/lib/sectionRegistry'

export const NO_ACCESS_ROUTE = '/no-access' as const

export function sectionForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) return null
  if (normalized === '/notifications' || normalized.startsWith('/notifications/')) {
    return null
  }
  if (normalized === NO_ACCESS_ROUTE || normalized.startsWith(`${NO_ACCESS_ROUTE}/`)) {
    return null
  }

  const byRoute = getSectionByRoute(normalized)
  if (byRoute) return byRoute.key

  const first = normalized.split('/').filter(Boolean)[0]
  if (first && first in SECTION_ROUTE_MAP) return first
  return null
}

export function canAccessPath(
  pathname: string,
  role: 'admin' | 'manager' | 'employee' | undefined,
  allowedSections: string[] | undefined,
): boolean {
  if (!role) return false
  if (role === 'admin') return true
  const section = sectionForPath(pathname)
  if (!section) return true
  if (!allowedSections) {
    return role !== 'employee' || DEFAULT_EMPLOYEE_SECTIONS.includes(section)
  }
  return allowedSections.includes(section)
}

export function filterNavBySections<T extends { to: string }>(
  items: T[],
  allowedSections: string[] | undefined,
  role: 'admin' | 'manager' | 'employee' | undefined,
): T[] {
  if (role === 'admin') return items
  return items.filter((item) => canAccessPath(item.to, role, allowedSections))
}

/**
 * First reachable app route for the user.
 * Never hardcodes /dashboard for managers — uses real allowed_sections.
 */
export function resolveHomeRoute(
  role: 'admin' | 'manager' | 'employee' | undefined,
  allowedSections: string[] | undefined,
): string {
  if (!role) return '/login'
  if (role === 'admin') return '/dashboard'

  const sections =
    allowedSections ??
    (role === 'employee'
      ? [...DEFAULT_EMPLOYEE_SECTIONS]
      : SECTION_REGISTRY.map((s) => s.key))

  const preferredKeys =
    role === 'employee'
      ? [
          'my-shift',
          ...SECTION_REGISTRY.map((s) => s.key).filter((k) => k !== 'my-shift'),
        ]
      : [
          'dashboard',
          'my-shift',
          'purchase-planner',
          'worktime',
          ...SECTION_REGISTRY.map((s) => s.key),
        ]

  const seen = new Set<string>()
  for (const key of preferredKeys) {
    if (seen.has(key)) continue
    seen.add(key)
    if (!sections.includes(key)) continue
    const def = getSectionByKey(key)
    if (def?.route) return def.route
  }

  return NO_ACCESS_ROUTE
}

/** Role-only fallback when sections are not loaded yet (prefer safe defaults). */
export function getHomeRoute(role: 'admin' | 'manager' | 'employee'): string {
  return resolveHomeRoute(role, undefined)
}
