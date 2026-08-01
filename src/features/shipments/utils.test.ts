import { describe, expect, it } from 'vitest'
import type { Shipment } from '@/types'
import { isoDay, isIsoDayInRange, sumShipments } from './utils'

function shipment(partial: Partial<Shipment> & Pick<Shipment, 'id' | 'date' | 'quantityKg'>): Shipment {
  return {
    cropType: 'wheat',
    cropCode: 'wheat',
    pricePerKg: 10,
    totalSum: (partial.quantityKg ?? 0) * 10,
    shipmentRequestId: null,
    ...partial,
  }
}

describe('shipments date helpers', () => {
  it('extracts ISO day from datetime', () => {
    expect(isoDay('2026-07-15T12:00:00Z')).toBe('2026-07-15')
    expect(isoDay(null)).toBeNull()
  })

  it('checks inclusive ISO day range', () => {
    expect(isIsoDayInRange('2026-07-10', '2026-07-01', '2026-07-31')).toBe(true)
    expect(isIsoDayInRange('2026-06-30', '2026-07-01', '2026-07-31')).toBe(false)
  })
})

describe('sumShipments for period KPI', () => {
  const july = [
    shipment({ id: '1', date: '2026-07-05', quantityKg: 1000, totalSum: 10000 }),
    shipment({ id: '2', date: '2026-07-20', quantityKg: 500, totalSum: 5000 }),
    shipment({ id: '3', date: '2026-07-31', quantityKg: 200, totalSum: 2000 }),
  ]
  const august = [
    shipment({ id: '4', date: '2026-08-01', quantityKg: 800, totalSum: 8000 }),
    shipment({ id: '5', date: '2026-08-15', quantityKg: 100, totalSum: 1000 }),
  ]
  const all = [...july, ...august]

  function inRange(rows: Shipment[], from: string, to: string) {
    return rows.filter((row) => isIsoDayInRange(row.date, from, to))
  }

  it('sums only July when period is July', () => {
    const filtered = inRange(all, '2026-07-01', '2026-07-31')
    expect(filtered).toHaveLength(3)
    expect(sumShipments(filtered)).toEqual({ totalKg: 1700, totalSum: 17000 })
  })

  it('sums only August when period is August', () => {
    const filtered = inRange(all, '2026-08-01', '2026-08-31')
    expect(filtered).toHaveLength(2)
    expect(sumShipments(filtered)).toEqual({ totalKg: 900, totalSum: 9000 })
  })

  it('sums all when period covers both months', () => {
    const filtered = inRange(all, '2026-07-01', '2026-08-31')
    expect(filtered).toHaveLength(5)
    expect(sumShipments(filtered)).toEqual({ totalKg: 2600, totalSum: 26000 })
  })

  it('returns zeros when period has no rows', () => {
    expect(sumShipments(inRange(all, '2026-09-01', '2026-09-30'))).toEqual({
      totalKg: 0,
      totalSum: 0,
    })
  })
})
