import type { RepairJournalEntry } from './types'
import { filterByListSearch } from '@/lib/listSearch'

export function filterRepairsBySearch(
  items: RepairJournalEntry[],
  search: string,
): RepairJournalEntry[] {
  return filterByListSearch(items, search, (row) => [
    row.assetLabel,
    row.equipmentName,
    row.implementName,
    row.type,
    row.description,
    row.status,
    row.priority,
    ...row.checklistItems.map((item) => item.description),
  ])
}
