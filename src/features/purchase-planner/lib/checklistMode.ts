import type { PurchasePlannerItem } from '../types'

const URGENCY_RANK: Record<string, number> = {
  urgent: 0,
  normal: 1,
  low: 2,
}

/** Checklist UX labels — internal status model stays planned/purchased/cancelled. */
export const CHECKLIST_STATUS_LABELS: Record<string, string> = {
  planned: 'К покупке',
  purchased: 'Куплено',
  cancelled: 'Отменено',
}

export function sortForChecklist(items: PurchasePlannerItem[]): PurchasePlannerItem[] {
  return [...items].sort((a, b) => {
    const ua = URGENCY_RANK[a.urgency] ?? 1
    const ub = URGENCY_RANK[b.urgency] ?? 1
    if (ua !== ub) return ua - ub
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0
    return tb - ta
  })
}

export function purchaseContextLabel(item: PurchasePlannerItem): string | null {
  if (item.maintenanceId) {
    const asset = item.maintenanceAssetLabel ?? item.linkedLabel
    return asset ? `Для ремонта: ${asset}` : 'Для ремонта'
  }
  if (item.linkedLabel && item.linkedLabel !== 'Общее') {
    return item.linkedLabel
  }
  return null
}
