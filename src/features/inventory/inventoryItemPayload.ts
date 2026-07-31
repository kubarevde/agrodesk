import { isHarvestCategory } from '@/features/inventory/utils'

/** Normalize Select/RHF crop value to a dictionary code (never `[object Object]`). */
export function asCropCode(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value: unknown }).value
    if (typeof inner === 'string') return inner.trim()
  }
  return ''
}

export function inventoryCropPayload(
  category: string | undefined,
  cropCode: unknown,
): string | null {
  if (!isHarvestCategory(category)) return null
  const code = asCropCode(cropCode)
  if (!code || code.toLowerCase() === 'none') return null
  return code
}

/** Build PATCH body for inventory item update (testable). */
export function buildInventoryItemUpdateBody(
  payload: {
    name?: string
    category?: string
    unit?: string
    minStock?: number
    totalCapacity?: number
    isActive?: boolean
    cropCode?: unknown
  },
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (payload.name !== undefined) body.name = payload.name
  if (payload.category !== undefined) body.category = payload.category
  if (payload.unit !== undefined) body.unit = payload.unit
  if (payload.minStock !== undefined) body.min_stock = payload.minStock
  if (payload.totalCapacity !== undefined) body.total_capacity = payload.totalCapacity
  if (payload.isActive !== undefined) body.is_active = payload.isActive

  const category = payload.category
  if (isHarvestCategory(category)) {
    const cropCode = inventoryCropPayload(category, payload.cropCode)
    if (!cropCode) {
      throw new Error('Для позиций «Урожай на складе» необходимо указать культуру.')
    }
    body.crop_code = cropCode
  } else if (category !== undefined) {
    // Non-harvest: clear crop link
    body.crop_code = null
  } else if (payload.cropCode !== undefined) {
    const code = asCropCode(payload.cropCode)
    if (!code || code.toLowerCase() === 'none') {
      throw new Error('Для позиций «Урожай на складе» необходимо указать культуру.')
    }
    body.crop_code = code
  }
  return body
}
