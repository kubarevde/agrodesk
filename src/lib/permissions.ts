/** Section keys — must match backend app/services/permissions.py */

export const SECTION_ROUTE_MAP: Record<string, string> = {
  'my-shift': '/my-shift',
  dashboard: '/dashboard',
  worktime: '/worktime',
  'agro-calendar': '/agro-calendar',
  sharing: '/sharing',
  fields: '/fields',
  equipment: '/equipment',
  implements: '/implements',
  maintenance: '/maintenance',
  'purchase-planner': '/purchase-planner',
  inventory: '/inventory',
  shipments: '/shipments',
  expenses: '/expenses',
  analytics: '/analytics/forecast',
  reports: '/reports',
  employees: '/employees',
  'audit-log': '/audit-log',
  settings: '/settings',
}

export function sectionForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, '') || '/'
  if (normalized === '/profile' || normalized.startsWith('/profile/')) return null
  if (normalized === '/notifications' || normalized.startsWith('/notifications/')) return null

  for (const [section, route] of Object.entries(SECTION_ROUTE_MAP)) {
    if (normalized === route || normalized.startsWith(`${route}/`)) return section
  }
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
  if (!allowedSections) return role !== 'employee' || section === 'my-shift' || section === 'sharing'
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
