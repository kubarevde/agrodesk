import type { InventoryItem } from '@/types'
import { getCategoryLabel, isHarvestCategory } from '@/features/inventory/utils'

/** Active warehouse items for shipment-request form — all categories, including harvest. */
export function selectableInventoryItemsForRequest(
  items: InventoryItem[],
): InventoryItem[] {
  return items.filter((item) => item.isActive !== false)
}

export function shipmentRequestItemOptionLabel(item: InventoryItem): string {
  const unit = item.unit ? ` (${item.unit})` : ''
  const category = getCategoryLabel(item.category)
  return `${item.name}${unit} · ${category}`
}

export function categoryColumnLabel(
  category: string | null | undefined,
  isHarvest?: boolean,
): string {
  if (isHarvest || isHarvestCategory(category)) {
    return getCategoryLabel('harvest')
  }
  if (!category) return '—'
  return getCategoryLabel(category)
}
