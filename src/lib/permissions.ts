import {
  DEFAULT_EMPLOYEE_SECTIONS,
  SECTION_ROUTE_MAP,
  getSectionByRoute,
} from '@/lib/sectionRegistry'

export { SECTION_ROUTE_MAP, DEFAULT_EMPLOYEE_SECTIONS } from '@/lib/sectionRegistry'

export function sectionForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) return null
  if (normalized === '/notifications' || normalized.startsWith('/notifications/')) {
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
