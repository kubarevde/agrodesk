import type { InventoryItem } from '@/types'
import { isHarvestCategory } from '@/features/inventory/utils'

export type InventoryListStatus = 'active' | 'archived' | 'all'

/** Client-side mirror of GET /api/inventory?status= (offline / older APIs). */
export function filterInventoryByStatus(
  items: InventoryItem[],
  status: InventoryListStatus,
): InventoryItem[] {
  if (status === 'archived') return items.filter((item) => item.isActive === false)
  if (status === 'all') return items
  return items.filter((item) => item.isActive !== false)
}

/** Client-side mirror of GET /api/inventory?search= (offline / tests). */
export function filterInventoryBySearch(
  items: InventoryItem[],
  search: string,
  cropNameByCode: Record<string, string> = {},
): InventoryItem[] {
  const term = search.trim().toLowerCase()
  if (!term) return items
  return items.filter((item) => {
    if (item.name.toLowerCase().includes(term)) return true
    if (!isHarvestCategory(item.category)) return false
    const code = (item.cropCode ?? '').trim().toLowerCase()
    if (code && code.includes(term)) return true
    const cropName = (cropNameByCode[item.cropCode ?? ''] ?? '').toLowerCase()
    return Boolean(cropName && cropName.includes(term))
  })
}

export function inventoryListQueryParams(options: {
  category?: string
  search?: string
  /** Prefer status; isActive kept for backward-compatible tests. */
  status?: InventoryListStatus
  isActive?: boolean
}): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {}
  if (options.status) {
    params.status = options.status
  } else if (options.isActive !== undefined) {
    params.is_active = options.isActive
  } else {
    params.status = 'active'
  }
  if (options.category && options.category !== 'all') params.category = options.category
  const search = (options.search ?? '').trim()
  if (search) params.search = search
  return params
}
