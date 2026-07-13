import type { InventoryItem } from '@/types'

export type InventoryCategoryFilter =
  | 'all'
  | 'fuel'
  | 'fertilizer'
  | 'seeds'
  | 'parts'
  | 'chemicals'

export const CATEGORY_FILTERS: { id: InventoryCategoryFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'fuel', label: 'Топливо' },
  { id: 'fertilizer', label: 'Удобрения' },
  { id: 'seeds', label: 'Семена' },
  { id: 'parts', label: 'Запчасти' },
  { id: 'chemicals', label: 'СЗР' },
]

const CATEGORY_LABELS: Record<InventoryItem['category'], string> = {
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  seeds: 'Семена',
  parts: 'Запчасти',
  chemicals: 'СЗР',
  other: 'Прочее',
}

export function getCategoryLabel(category: InventoryItem['category']): string {
  return CATEGORY_LABELS[category]
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

export const SUPPLIERS = [
  'Лукойл',
  'АгроХим Снаб',
  'Сингента',
  'Автодизель',
  'ФосАгро',
  'ЭлитСемена',
] as const
