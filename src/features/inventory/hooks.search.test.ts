import { describe, expect, it } from 'vitest'
import { inventoryListQueryParams } from '@/features/inventory/inventorySearch'

describe('useInventory search query params', () => {
  it('includes search in GET /api/inventory params', () => {
    expect(
      inventoryListQueryParams({
        category: 'harvest',
        search: 'пшен',
        isActive: true,
      }),
    ).toEqual({
      is_active: true,
      category: 'harvest',
      search: 'пшен',
    })
  })

  it('keeps category filter together with search', () => {
    const params = inventoryListQueryParams({
      category: 'fuel',
      search: 'дт',
      isActive: true,
    })
    expect(params).toMatchObject({ category: 'fuel', search: 'дт' })
  })
})
