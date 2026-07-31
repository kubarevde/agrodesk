import type { InventoryItem, InventoryOperation } from '@/types'

/** Temporary offline fallback labels; UI filters use useDictionary('inventory_category'). */
const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  seeds: 'Семена',
  parts: 'Запчасти',
  chemicals: 'СЗР',
  harvest: 'Урожай (на складе)',
  other: 'Прочее',
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export function isHarvestCategory(category: string | null | undefined): boolean {
  return (category ?? '').trim().toLowerCase() === 'harvest'
}

/** Human-readable operation type for tables, history, and exports. */
export function getInventoryOperationLabel(
  operation: Pick<InventoryOperation, 'type' | 'purpose' | 'fieldName'>,
): string {
  const purpose = operation.purpose ?? 'general'
  if (purpose === 'opening') return 'Начальный остаток'
  if (purpose === 'adjustment') {
    return operation.type === 'income' ? 'Корректировка (+)' : 'Корректировка (−)'
  }
  if (purpose === 'refuel') return 'Заправка'
  if (purpose === 'install') return 'Установка'
  if (purpose === 'shipment_request') return 'Расход по заявке на отгрузку'
  if (purpose === 'harvest_income') {
    const field = (operation.fieldName ?? '').trim()
    return field ? `Сбор с поля ${field}` : 'Сбор урожая с поля'
  }
  return operation.type === 'income' ? 'Приход' : 'Расход'
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
