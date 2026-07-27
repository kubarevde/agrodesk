import { describe, expect, it } from 'vitest'
import { LANDING_IMAGES, LANDING_NAV } from '@/features/landing/nav'

describe('landing nav', () => {
  it('exposes section anchors used by header and footer', () => {
    expect(LANDING_NAV.map((item) => item.id)).toEqual([
      'day',
      'roles',
      'modules',
      'telegram',
    ])
  })

  it('resolves public image URLs under /landing/', () => {
    expect(LANDING_IMAGES.hero).toContain('landing/hero-field.webp')
    expect(LANDING_IMAGES.shifts).toContain('landing/module-shifts.webp')
    expect(LANDING_IMAGES.warehouse).toContain('landing/module-warehouse.webp')
    expect(LANDING_IMAGES.calendar).toContain('landing/module-calendar.webp')
  })
})
