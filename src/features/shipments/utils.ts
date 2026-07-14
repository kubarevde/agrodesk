import type { Shipment } from '@/types'

export const CROP_TYPES = [
  'Пшеница',
  'Подсолнечник',
  'Кукуруза',
  'Ячмень',
  'Другое',
] as const

export type CropType = (typeof CROP_TYPES)[number]

export function formatKg(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} кг`
}

export function formatTonnes(kg: number): string {
  return `${(kg / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} т`
}

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
}

export function calcShipmentSum(quantityKg: number, pricePerKg: number): number {
  return quantityKg * pricePerKg
}

export function sumShipments(shipments: Shipment[]): { totalKg: number; totalSum: number } {
  return shipments.reduce(
    (acc, shipment) => ({
      totalKg: acc.totalKg + shipment.quantityKg,
      totalSum: acc.totalSum + (shipment.totalSum ?? 0),
    }),
    { totalKg: 0, totalSum: 0 },
  )
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
