import type { InventoryItem } from '@/types'
import { getCategoryLabel, isHarvestCategory } from '@/features/inventory/utils'

type SelectableOptions = {
  /** Drop harvest / crop warehouse items (TMC-only forms). */
  excludeHarvest?: boolean
}

/** Active warehouse items for shipment-request form — optionally by category. */
export function selectableInventoryItemsForRequest(
  items: InventoryItem[],
  category?: string | null,
  options?: SelectableOptions,
): InventoryItem[] {
  let active = items.filter((item) => item.isActive !== false)
  if (options?.excludeHarvest) {
    active = active.filter(
      (item) => !isHarvestCategory(item.category) && item.isHarvest !== true,
    )
  }
  const code = (category ?? '').trim()
  if (!code || code === 'all') return active
  return active.filter((item) => item.category === code)
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
