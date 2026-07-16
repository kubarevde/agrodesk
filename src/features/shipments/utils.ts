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
