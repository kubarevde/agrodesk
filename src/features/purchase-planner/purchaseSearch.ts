import type { PurchasePlannerItem } from './types'
import { filterByListSearch } from '@/lib/listSearch'

export function filterPurchasesBySearch(
  items: PurchasePlannerItem[],
  search: string,
): PurchasePlannerItem[] {
  return filterByListSearch(items, search, (row) => [
    row.title,
    row.notes,
    row.category,
    row.urgency,
    row.status,
    row.purchasePlace,
    row.responsibleName,
    row.equipmentName,
    row.implementName,
    row.inventoryItemName,
    row.linkedLabel,
    row.maintenanceAssetLabel,
  ])
}
