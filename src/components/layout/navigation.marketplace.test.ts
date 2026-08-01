import { describe, expect, it } from 'vitest'
import { getNavGroups } from './navigation'

describe('marketplace seller nav feature flag', () => {
  it('hides Магазин when marketplace_enabled is off (even for admin)', () => {
    const groups = getNavGroups('admin', undefined, undefined, {
      marketplaceEnabled: false,
    })
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).not.toContain('Магазин')
    expect(labels).toContain('Отгрузки урожая')
    expect(labels).toContain('Дашборд')
  })

  it('shows Магазин only when marketplace enabled and action granted', () => {
    const withoutAction = getNavGroups(
      'manager',
      ['shipments', 'dashboard', 'inventory'],
      ['shipment_requests.manage'],
      { marketplaceEnabled: true },
    )
    expect(withoutAction.flatMap((g) => g.items.map((i) => i.label))).not.toContain('Магазин')

    const withAction = getNavGroups(
      'manager',
      ['shipments', 'dashboard', 'inventory'],
      ['marketplace.manage'],
      { marketplaceEnabled: true },
    )
    expect(withAction.flatMap((g) => g.items.map((i) => i.label))).toContain('Магазин')
  })

  it('does not show Магазин when marketplaceEnabled is undefined (loading)', () => {
    const groups = getNavGroups('admin', undefined, ['marketplace.manage'], {})
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).not.toContain('Магазин')
  })
})
