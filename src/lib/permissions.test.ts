import { describe, expect, it } from 'vitest'
import { SECTION_ROUTE_MAP, sectionForPath } from '@/lib/permissions'

const GUARDED_SECTIONS = Object.keys(SECTION_ROUTE_MAP)

describe('permissions route coverage', () => {
  it('maps every section key to a route prefix', () => {
    for (const section of GUARDED_SECTIONS) {
      expect(SECTION_ROUTE_MAP[section]).toMatch(/^\//)
    }
  })

  it('resolves nested paths to section', () => {
    expect(sectionForPath('/equipment/abc-123')).toBe('equipment')
    expect(sectionForPath('/purchase-planner')).toBe('purchase-planner')
    expect(sectionForPath('/analytics/forecast')).toBe('analytics')
  })
})
