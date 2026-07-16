import type { InventoryItem } from '@/types'

/** Temporary offline fallback labels; UI filters use useDictionary('inventory_category'). */
const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  seeds: 'Семена',
  parts: 'Запчасти',
  chemicals: 'СЗР',
  other: 'Прочее',
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export function getStockPercent(item: InventoryItem): number {
  if (item.totalCapacity <= 0) return 0
  return Math.min(100, Math.round((item.currentStock / item.totalCapacity) * 100))
}

export function getProgressBarColor(percent: number): string {
  if (percent > 50) return '#437A22'
  if (percent >= 20) return '#DA7101'
  return '#A13544'
}

export function isCriticalStock(item: InventoryItem): boolean {
  return item.currentStock < item.minStock
}
