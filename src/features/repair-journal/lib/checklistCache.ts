import type { QueryClient } from '@tanstack/react-query'
import type { ActiveRepairsSummary, ChecklistItem, RepairJournalEntry } from '../types'

function patchEntryItems(
  entry: RepairJournalEntry,
  itemId: string,
  isDone: boolean,
): RepairJournalEntry {
  const hasItem = entry.checklistItems.some((item) => item.id === itemId)
  if (!hasItem) return entry

  const checklistItems = entry.checklistItems.map((item) =>
    item.id === itemId
      ? {
          ...item,
          isDone,
          doneAt: isDone ? new Date().toISOString() : null,
        }
      : item,
  )
  return {
    ...entry,
    checklistItems,
    checklistDone: checklistItems.filter((item) => item.isDone).length,
    checklistTotal: checklistItems.length,
  }
}

export function applyChecklistDoneToCaches(
  qc: QueryClient,
  itemId: string,
  isDone: boolean,
): void {
  qc.setQueriesData({ queryKey: ['repair-journal'] }, (old: unknown) => {
    if (Array.isArray(old)) {
      return (old as RepairJournalEntry[]).map((entry) =>
        patchEntryItems(entry, itemId, isDone),
      )
    }
    if (old && typeof old === 'object' && 'items' in old) {
      const summary = old as ActiveRepairsSummary
      if (!Array.isArray(summary.items)) return old
      return {
        ...summary,
        items: summary.items.map((entry) => patchEntryItems(entry, itemId, isDone)),
      }
    }
    return old
  })
}

export function mergeChecklistItemIntoCaches(
  qc: QueryClient,
  item: ChecklistItem,
): void {
  qc.setQueriesData({ queryKey: ['repair-journal'] }, (old: unknown) => {
    if (Array.isArray(old)) {
      return (old as RepairJournalEntry[]).map((entry) => {
        if (entry.id !== item.maintenanceId) return entry
        const exists = entry.checklistItems.some((row) => row.id === item.id)
        const checklistItems = exists
          ? entry.checklistItems.map((row) => (row.id === item.id ? item : row))
          : [...entry.checklistItems, item]
        return {
          ...entry,
          checklistItems,
          checklistDone: checklistItems.filter((row) => row.isDone).length,
          checklistTotal: checklistItems.length,
        }
      })
    }
    return old
  })
}

export function applyRepairPatchToCaches(
  qc: QueryClient,
  repairId: string,
  patch: Partial<RepairJournalEntry>,
): void {
  const mapEntry = (entry: RepairJournalEntry): RepairJournalEntry =>
    entry.id === repairId ? { ...entry, ...patch } : entry

  qc.setQueriesData({ queryKey: ['repair-journal'] }, (old: unknown) => {
    if (Array.isArray(old)) {
      return (old as RepairJournalEntry[]).map(mapEntry)
    }
    if (old && typeof old === 'object' && 'items' in old) {
      const summary = old as ActiveRepairsSummary
      if (!Array.isArray(summary.items)) return old
      return {
        ...summary,
        items: summary.items.map(mapEntry),
      }
    }
    return old
  })
}
