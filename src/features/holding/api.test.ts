import { describe, expect, it } from 'vitest'
import { mapHoldingOverview } from './api'

describe('mapHoldingOverview', () => {
  it('maps allowlisted fields from API without inventing aggregates', () => {
    const mapped = mapHoldingOverview({
      head_org_id: 'head-1',
      children: [
        {
          org_id: 'child-1',
          name: 'КФХ Север',
          slug: 'north',
          is_active: true,
          employees_count: 4,
          active_shifts_count: 1,
          month_shifts_count: 10,
          month_hours: 80.5,
          month_shipments_kg: 2000,
          month_shipments_sum: 150000,
          month_expenses_sum: 20000,
          critical_inventory_count: 2,
          shipment_requests_active: 3,
        },
      ],
      totals: {
        org_id: 'head-1',
        name: 'Итого',
        slug: 'totals',
        is_active: true,
        employees_count: 4,
        active_shifts_count: 1,
        month_shifts_count: 10,
        month_hours: 80.5,
        month_shipments_kg: 2000,
        month_shipments_sum: 150000,
        month_expenses_sum: 20000,
        critical_inventory_count: 2,
        shipment_requests_active: 3,
      },
    })

    expect(mapped.headOrgId).toBe('head-1')
    expect(mapped.children).toHaveLength(1)
    expect(mapped.children[0]?.name).toBe('КФХ Север')
    expect(mapped.children[0]?.monthShipmentsKg).toBe(2000)
    expect(mapped.totals?.employeesCount).toBe(4)
  })
})
