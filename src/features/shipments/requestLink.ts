import type { Shipment } from '@/types'
import type { ShipmentRequest } from '@/features/shipment-requests/types'
import { isoDateToDisplay } from '@/lib/dates'
import { formatApiDate } from '@/features/worktime/utils'

export const NONE_REQUEST_VALUE = 'none'

/** Compact select label — fits the shipment form dialog. */
export function harvestRequestOptionLabel(
  row: ShipmentRequest,
  remainingKg?: number,
): string {
  const qty = remainingKg ?? row.quantity
  const qtyLabel = qty.toLocaleString('ru-RU')
  const customer = row.customerName.trim() || 'Покупатель'
  return `${customer} · ${qtyLabel} кг`
}

export function shortRequestRef(requestId: string): string {
  return requestId.slice(0, 8)
}

/** Kg already linked to a harvest request (optional exclude = shipment being edited). */
export function usedKgForRequest(
  shipments: Shipment[],
  requestId: string,
  excludeShipmentId?: string | null,
): number {
  let used = 0
  for (const shipment of shipments) {
    if (shipment.shipmentRequestId !== requestId) continue
    if (excludeShipmentId && shipment.id === excludeShipmentId) continue
    used += Number(shipment.quantityKg) || 0
  }
  return used
}

export function remainingKgForRequest(requestQty: number, usedKg: number): number {
  return Math.max(0, (Number(requestQty) || 0) - usedKg)
}

/**
 * Request stays selectable while residual volume remains (partial shipments allowed).
 * Always keep the request currently linked on the form.
 */
export function isHarvestRequestSelectable(
  request: ShipmentRequest,
  shipments: Shipment[],
  options?: {
    excludeShipmentId?: string | null
    keepRequestId?: string | null
  },
): boolean {
  const keep = options?.keepRequestId
  if (keep && keep !== NONE_REQUEST_VALUE && keep === request.id) return true
  const used = usedKgForRequest(shipments, request.id, options?.excludeShipmentId)
  return remainingKgForRequest(request.quantity, used) > 0
}

/** Display date (dd.MM.yyyy) from request completion instant. */
export function shipmentDateFromRequest(row: ShipmentRequest): string {
  if (row.completedAt) {
    const isoDay = row.completedAt.slice(0, 10)
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDateToDisplay(isoDay)
  }
  return formatApiDate(new Date())
}

export type RequestAutofillValues = {
  quantityKg: number
  pricePerKg: number
  destination: string
  date: string
}

/** Starter values from the request — caller writes them into the form. */
export function requestAutofillValues(
  row: ShipmentRequest,
  remainingKg: number,
): RequestAutofillValues {
  return {
    quantityKg: remainingKg > 0 ? remainingKg : row.quantity,
    pricePerKg: row.price,
    destination: row.customerName,
    date: shipmentDateFromRequest(row),
  }
}
