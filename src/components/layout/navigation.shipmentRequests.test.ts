import { describe, expect, it } from 'vitest'
import { getNavGroups } from './navigation'

describe('shipment requests nav feature flag', () => {
  it('hides shipment request links when flag is off', () => {
    const groups = getNavGroups('admin', undefined, undefined, {
      shipmentRequestsEnabled: false,
    })
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).not.toContain('Заявки на отгрузку')
    expect(labels).not.toContain('Мои заявки ТМЦ')
    expect(labels).toContain('Отгрузки урожая')
  })

  it('shows manager link when flag is on', () => {
    const groups = getNavGroups(
      'manager',
      ['shipments', 'dashboard', 'inventory'],
      ['shipment_requests.manage', 'shipment_requests.execute'],
      { shipmentRequestsEnabled: true },
    )
    const labels = groups.flatMap((g) => g.items.map((i) => i.label))
    expect(labels).toContain('Заявки на отгрузку')
    expect(labels).toContain('Отгрузки урожая')
  })
})
