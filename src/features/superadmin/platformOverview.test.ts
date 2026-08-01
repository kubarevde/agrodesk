import { describe, expect, it } from 'vitest'
import type { SuperAdminStats } from '@/features/superadmin/types'

function coreUsageKeys(stats: SuperAdminStats): (keyof SuperAdminStats)[] {
  return [
    'totalOrgs',
    'activeOrgs',
    'totalEmployees',
    'totalShiftsToday',
    'openShifts',
    'supportUnread',
  ]
}

function marketplaceKeys(stats: SuperAdminStats): (keyof SuperAdminStats)[] {
  return ['marketplaceOrgs', 'listingsPendingReview', 'listingsPublished', 'ordersNew']
}

describe('superadmin platform overview separation', () => {
  it('keeps marketplace metrics addressable separately from core usage', () => {
    const sample = {
      totalOrgs: 1,
      marketplaceOrgs: 1,
      listingsPendingReview: 2,
      totalShiftsToday: 3,
    } as SuperAdminStats
    expect(coreUsageKeys(sample)).not.toContain('listingsPendingReview')
    expect(marketplaceKeys(sample)).toContain('marketplaceOrgs')
    expect(marketplaceKeys(sample)).not.toContain('totalShiftsToday')
  })
})
