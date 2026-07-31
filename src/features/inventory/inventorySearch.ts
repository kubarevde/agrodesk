import type { InventoryItem } from '@/types'
import { isHarvestCategory } from '@/features/inventory/utils'

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
  isActive?: boolean
}): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {}
  if (options.isActive !== undefined) params.is_active = options.isActive
  if (options.category && options.category !== 'all') params.category = options.category
  const search = (options.search ?? '').trim()
  if (search) params.search = search
  return params
}
