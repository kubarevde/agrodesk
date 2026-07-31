import type { InventoryItem } from '@/types'
import { isHarvestCategory } from '@/features/inventory/utils'
import type { FieldResponse } from '@/features/fields/types'

export type CropDictRow = { code: string; name: string }

/** Resolve field crop_code, optionally via crop dictionary from crop_type. */
export function fieldEffectiveCropCode(
  field: Pick<FieldResponse, 'crop_code' | 'crop_type'>,
  crops: CropDictRow[] = [],
): string | null {
  const code = (field.crop_code ?? '').trim()
  if (code) return code
  const type = (field.crop_type ?? '').trim()
  if (!type) return null
  const matches = crops.filter(
    (row) =>
      row.code === type ||
      row.name === type ||
      row.name.localeCompare(type, 'ru', { sensitivity: 'accent' }) === 0,
  )
  if (matches.length === 1) return matches[0].code
  const byCode = crops.filter((row) => row.code.toLowerCase() === type.toLowerCase())
  if (byCode.length === 1) return byCode[0].code
  return null
}

/** Why the collect-harvest action cannot proceed (null = ready). */
export function fieldHarvestBlockReason(
  field: Pick<FieldResponse, 'crop_code' | 'crop_type'>,
  harvestItems: InventoryItem[],
  crops: CropDictRow[] = [],
): string | null {
  const hasLabel = Boolean((field.crop_code ?? '').trim() || (field.crop_type ?? '').trim())
  if (!hasLabel) {
    return 'У поля не задана культура (код). Укажите культуру поля перед сбором.'
  }
  const code = fieldEffectiveCropCode(field, crops)
  if (!code) {
    return (
      'Не удалось однозначно определить код культуры поля — проверьте справочник культур.'
    )
  }
  if (harvestItems.length === 0) {
    const cropName =
      crops.find((row) => row.code === code)?.name ?? code
    return (
      `На складе нет активной позиции «Урожай» с культурой ${cropName}, ` +
      'создайте её в разделе «Склад».'
    )
  }
  return null
}

export function harvestItemsMatchingCrop(
  items: InventoryItem[],
  cropCode: string | null | undefined,
): InventoryItem[] {
  const code = (cropCode ?? '').trim().toLowerCase()
  if (!code) return []
  return items.filter(
    (item) =>
      item.isActive !== false &&
      isHarvestCategory(item.category) &&
      (item.cropCode ?? '').trim().toLowerCase() === code,
  )
}

export type HarvestByFieldYearRow = {
  fieldId: string | null
  fieldName: string
  year: number
  quantity: number
}

/** Aggregate harvest_income ops by field + calendar year. */
export function aggregateHarvestIncomeByFieldYear(
  operations: Array<{
    type: string
    purpose?: string
    fieldId?: string | null
    fieldName?: string | null
    date: string
    quantity: number
  }>,
): HarvestByFieldYearRow[] {
  const map = new Map<string, HarvestByFieldYearRow>()
  for (const op of operations) {
    if (op.type !== 'income' || (op.purpose ?? '') !== 'harvest_income') continue
    const year = yearFromDisplayDate(op.date)
    if (year == null) continue
    const fieldId = op.fieldId ?? null
    const key = `${fieldId ?? 'none'}:${year}`
    const existing = map.get(key)
    const fieldName = (op.fieldName ?? '').trim() || 'Поле не указано'
    if (existing) {
      existing.quantity += op.quantity
    } else {
      map.set(key, { fieldId, fieldName, year, quantity: op.quantity })
    }
  }
  return [...map.values()].sort((a, b) => b.year - a.year || a.fieldName.localeCompare(b.fieldName, 'ru'))
}

function yearFromDisplayDate(value: string): number | null {
  // API transformer uses DD.MM.YYYY; accept ISO YYYY-MM-DD too
  const iso = /^(\d{4})-/.exec(value)
  if (iso) return Number(iso[1])
  const parts = value.split('.')
  if (parts.length === 3) {
    const year = Number(parts[2])
    return Number.isFinite(year) ? year : null
  }
  return null
}
