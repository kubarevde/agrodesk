import type { TmcShipment } from '@/types'
import { formatMoney as formatMoneyBase } from '@/lib/format'

export function formatTmcMoney(value: number): string {
  return formatMoneyBase(value)
}

export function formatTmcQty(quantity: number, unit: string): string {
  const qty = quantity.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
  const u = (unit || '').trim()
  return u ? `${qty} ${u}` : qty
}

/** Sum quantities per unit for KPI «Всего отгружено». */
export function sumTmcByUnit(shipments: TmcShipment[]): Array<{ unit: string; quantity: number }> {
  const map = new Map<string, number>()
  for (const row of shipments) {
    const unit = (row.unit || 'шт').trim() || 'шт'
    map.set(unit, (map.get(unit) ?? 0) + row.quantity)
  }
  return Array.from(map.entries())
    .map(([unit, quantity]) => ({ unit, quantity }))
    .sort((a, b) => a.unit.localeCompare(b.unit, 'ru'))
}

export function formatTmcShippedTotal(shipments: TmcShipment[]): string {
  const parts = sumTmcByUnit(shipments)
  if (parts.length === 0) return '0'
  return parts.map((p) => formatTmcQty(p.quantity, p.unit)).join(' · ')
}

export function sumTmcRevenue(shipments: TmcShipment[]): number {
  return shipments.reduce((sum, row) => sum + (row.totalSum ?? 0), 0)
}

export function calcTmcSum(quantity: number, pricePerUnit: number): number {
  return quantity * pricePerUnit
}

export function groupTmcShipmentsByItem(
  shipments: TmcShipment[],
): Array<{ name: string; quantity: number; unit: string; revenue: number }> {
  const map = new Map<string, { quantity: number; unit: string; revenue: number }>()
  for (const row of shipments) {
    const key = row.itemName
    const prev = map.get(key) ?? { quantity: 0, unit: row.unit, revenue: 0 }
    map.set(key, {
      quantity: prev.quantity + row.quantity,
      unit: row.unit || prev.unit,
      revenue: prev.revenue + (row.totalSum ?? 0),
    })
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
}

export function usedQtyForRequestLink(
  shipments: Array<{ id: string; quantity: number; shipmentRequestId?: string | null }>,
  requestId: string,
  excludeShipmentId?: string | null,
): number {
  let used = 0
  for (const row of shipments) {
    if (row.shipmentRequestId !== requestId) continue
    if (excludeShipmentId && row.id === excludeShipmentId) continue
    used += Number(row.quantity) || 0
  }
  return used
}
