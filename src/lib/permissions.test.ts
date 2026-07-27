import { describe, expect, it } from 'vitest'
import {
  canAccessPath,
  filterNavBySections,
  NO_ACCESS_ROUTE,
  resolveHomeRoute,
  sectionForPath,
  SECTION_ROUTE_MAP,
} from '@/lib/permissions'
import { SECTION_REGISTRY } from '@/lib/sectionRegistry'
import { getNavGroups, getNavItems, NAV_ITEMS } from '@/components/layout/navigation'
import { normalizePermissionsQueryData } from '@/features/auth/utils'

const GUARDED_SECTIONS = Object.keys(SECTION_ROUTE_MAP)

describe('permissions route coverage', () => {
  it('maps every registry section key to a route prefix', () => {
    for (const section of SECTION_REGISTRY) {
      expect(SECTION_ROUTE_MAP[section.key]).toBe(section.route)
      expect(section.route).toMatch(/^\//)
    }
  })

  it('resolves nested paths to section', () => {
    expect(sectionForPath('/equipment/abc-123')).toBe('equipment')
    expect(sectionForPath('/purchase-planner')).toBe('purchase-planner')
    expect(sectionForPath('/analytics/forecast')).toBe('analytics')
  })

  it('covers every nav item with a section mapping', () => {
    for (const item of NAV_ITEMS) {
      expect(sectionForPath(item.to)).not.toBeNull()
    }
  })
})

describe('resolveHomeRoute', () => {
  it('sends admin to dashboard', () => {
    expect(resolveHomeRoute('admin', [])).toBe('/dashboard')
  })

  it('does not force manager onto dashboard when it is revoked', () => {
    expect(resolveHomeRoute('manager', ['purchase-planner', 'worktime'])).toBe(
      '/purchase-planner',
    )
  })

  it('uses my-shift for employee by default', () => {
    expect(
      resolveHomeRoute('employee', ['my-shift', 'sharing', 'purchase-planner']),
    ).toBe('/my-shift')
  })

  it('falls back to no-access when nothing is granted', () => {
    expect(resolveHomeRoute('manager', [])).toBe(NO_ACCESS_ROUTE)
  })
})

describe('canAccessPath / filterNavBySections', () => {
  it('admin always allowed', () => {
    expect(canAccessPath('/employees', 'admin', [])).toBe(true)
  })

  it('employee without loaded grants only gets defaults', () => {
    expect(canAccessPath('/my-shift', 'employee', undefined)).toBe(true)
    expect(canAccessPath('/sharing', 'employee', undefined)).toBe(true)
    expect(canAccessPath('/fields', 'employee', undefined)).toBe(false)
  })

  it('employee with granted section can access it', () => {
    const allowed = ['my-shift', 'sharing', 'fields', 'equipment', 'purchase-planner']
    expect(canAccessPath('/fields', 'employee', allowed)).toBe(true)
    expect(canAccessPath('/equipment', 'employee', allowed)).toBe(true)
    expect(canAccessPath('/purchase-planner', 'employee', allowed)).toBe(true)
    expect(canAccessPath('/reports', 'employee', allowed)).toBe(false)
  })

  it('manager without dashboard cannot open dashboard path', () => {
    expect(canAccessPath('/dashboard', 'manager', ['purchase-planner'])).toBe(false)
    expect(canAccessPath('/purchase-planner', 'manager', ['purchase-planner'])).toBe(true)
  })

  it('filterNavBySections matches canAccessPath', () => {
    const allowed = ['my-shift', 'sharing', 'fields']
    const items = [
      { to: '/my-shift' },
      { to: '/fields' },
      { to: '/reports' },
    ]
    const filtered = filterNavBySections(items, allowed, 'employee')
    expect(filtered.map((i) => i.to)).toEqual(['/my-shift', '/fields'])
  })
})

describe('getNavGroups for employee', () => {
  it('shows only defaults while permissions are loading', () => {
    const groups = getNavGroups('employee', undefined)
    const paths = groups.flatMap((g) => g.items.map((i) => i.to))
    expect(paths).toEqual(['/my-shift', '/sharing'])
  })

  it('shows granted sections after permissions load', () => {
    const allowed = ['my-shift', 'sharing', 'fields', 'reports']
    const paths = getNavItems('employee', allowed).map((i) => i.to)
    expect(paths).toContain('/fields')
    expect(paths).toContain('/reports')
    expect(paths).not.toContain('/employees')
  })

  it('desktop and employee-home use the same filter source', () => {
    const allowed = ['my-shift', 'sharing', 'inventory']
    const sidebar = getNavItems('employee', allowed).map((i) => i.to)
    const home = getNavItems('employee', allowed)
      .filter((i) => i.to !== '/my-shift')
      .map((i) => i.to)
    expect(home.every((to) => sidebar.includes(to))).toBe(true)
    expect(home).toContain('/inventory')
  })
})

describe('normalizePermissionsQueryData', () => {
  it('reads object cache shape used by sidebar', () => {
    expect(
      normalizePermissionsQueryData({
        role: 'employee',
        allowedSections: ['my-shift', 'fields'],
      }),
    ).toEqual(['my-shift', 'fields'])
  })

  it('reads legacy array cache shape from old guards', () => {
    expect(normalizePermissionsQueryData(['my-shift', 'sharing'])).toEqual([
      'my-shift',
      'sharing',
    ])
  })
})

describe('section key inventory', () => {
  it('has no duplicate keys', () => {
    const keys = SECTION_REGISTRY.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys).toEqual(GUARDED_SECTIONS)
  })

  it('locks only my-shift for employees', () => {
    const locked = SECTION_REGISTRY.filter((s) => s.alwaysVisibleForEmployee).map((s) => s.key)
    expect(locked).toEqual(['my-shift'])
    expect(SECTION_REGISTRY.find((s) => s.key === 'sharing')?.alwaysVisibleForEmployee).toBe(
      false,
    )
  })
})
