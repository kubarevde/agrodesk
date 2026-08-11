import type { Shipment } from '@/types'
import { formatMoney as formatMoneyBase } from '@/lib/format'
import {
  resolveDictionaryLabel,
  type DictionaryLabelRow,
} from '@/features/dictionaries/labels'

export function formatMoney(value: number): string {
  return formatMoneyBase(value)
}

export function formatKg(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`
}

export function formatTonnes(kg: number): string {
  return `${(kg / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} т`
}

export function calcShipmentSum(quantityKg: number, pricePerKg: number): number {
  return quantityKg * pricePerKg
}

export function sumShipmentKg(shipments: Shipment[]): number {
  return shipments.reduce((sum, shipment) => sum + shipment.quantityKg, 0)
}

export function sumShipmentAmount(shipments: Shipment[]): number {
  return shipments.reduce((sum, shipment) => sum + (shipment.totalSum ?? 0), 0)
}

export function sumShipments(shipments: Shipment[]): { totalKg: number; totalSum: number } {
  return {
    totalKg: sumShipmentKg(shipments),
    totalSum: sumShipmentAmount(shipments),
  }
}

/** Resolve crop display label: dictionary name if matched, else stored historical string. */
export function getCropLabel(
  cropType: string,
  dictionary?: DictionaryLabelRow[],
): string {
  return resolveDictionaryLabel(cropType, dictionary)
}

export function groupShipmentsByCrop(
  shipments: Shipment[],
): Array<{ cropType: string; quantityKg: number }> {
  const map = new Map<string, number>()

  for (const shipment of shipments) {
    map.set(shipment.cropType, (map.get(shipment.cropType) ?? 0) + shipment.quantityKg)
  }

  return Array.from(map.entries()).map(([cropType, quantityKg]) => ({
    cropType,
    quantityKg,
  }))
}

/** Apply harvest list filters that may also be sent to the API. */
export function filterHarvestShipments(
  shipments: Shipment[],
  filters: { cropType?: string; varietyId?: string },
): Shipment[] {
  const cropType = filters.cropType?.trim()
  const varietyId = filters.varietyId?.trim()
  if (!cropType && !varietyId) return shipments

  return shipments.filter((row) => {
    if (cropType && row.cropType !== cropType) return false
    if (varietyId && row.varietyId !== varietyId) return false
    return true
  })
}

/** ISO date (yyyy-MM-dd) from completedAt / plannedAt for range checks. */
export function isoDay(value: string | null | undefined): string | null {
  if (!value) return null
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

export function isIsoDayInRange(
  day: string | null,
  fromIso: string,
  toIso: string,
): boolean {
  if (!day) return false
  return day >= fromIso && day <= toIso
}
