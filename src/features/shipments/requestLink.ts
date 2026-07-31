import type { ShipmentRequest } from '@/features/shipment-requests/types'

export const NONE_REQUEST_VALUE = 'none'

export function harvestRequestOptionLabel(row: ShipmentRequest): string {
  const short = row.id.slice(0, 8)
  const item = row.inventoryItemName ?? 'ТМЦ'
  return `${short} · ${row.customerName} · ${item} (${row.quantity})`
}

export function shortRequestRef(requestId: string): string {
  return requestId.slice(0, 8)
}
