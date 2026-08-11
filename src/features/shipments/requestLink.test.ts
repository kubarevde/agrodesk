import { describe, expect, it } from 'vitest'
import type { Shipment } from '@/types'
import type { ShipmentRequest } from '@/features/shipment-requests/types'
import {
  harvestRequestOptionLabel,
  isHarvestRequestSelectable,
  remainingKgForRequest,
  requestAutofillValues,
  shipmentDateFromRequest,
  shortRequestRef,
  usedKgForRequest,
} from './requestLink'

const sample = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  customerName: 'ООО Зерно',
  inventoryItemName: 'Пшеница склад',
  quantity: 100,
  price: 12.5,
  completedAt: '2026-07-15T10:00:00Z',
} as ShipmentRequest

function shipment(partial: Partial<Shipment>): Shipment {
  return {
    id: 's1',
    date: '01.07.2026',
    cropType: 'Пшеница',
    cropCode: 'wheat',
    quantityKg: 40,
    destination: 'Элеватор',
    pricePerKg: 10,
    totalSum: 400,
    notes: undefined,
    shipmentRequestId: sample.id,
    ...partial,
  }
}

describe('shipment request link helpers', () => {
  it('builds compact option label with remaining kg', () => {
    expect(harvestRequestOptionLabel(sample)).toContain('ООО Зерно')
    expect(harvestRequestOptionLabel(sample, 60)).toContain('60')
    expect(harvestRequestOptionLabel(sample)).not.toContain('abcdef12')
  })

  it('shortens request id for badges', () => {
    expect(shortRequestRef(sample.id)).toBe('abcdef12')
  })

  it('computes residual and hides fully covered requests', () => {
    const rows = [
      shipment({ id: 'a', quantityKg: 40 }),
      shipment({ id: 'b', quantityKg: 60 }),
    ]
    expect(usedKgForRequest(rows, sample.id)).toBe(100)
    expect(remainingKgForRequest(100, 100)).toBe(0)
    expect(
      isHarvestRequestSelectable(sample, rows, { excludeShipmentId: null }),
    ).toBe(false)
    expect(
      isHarvestRequestSelectable(sample, [shipment({ id: 'a', quantityKg: 40 })]),
    ).toBe(true)
    expect(
      isHarvestRequestSelectable(sample, rows, { keepRequestId: sample.id }),
    ).toBe(true)
  })

  it('builds autofill from request completion date and residual qty', () => {
    const values = requestAutofillValues(sample, 55)
    expect(values.quantityKg).toBe(55)
    expect(values.pricePerKg).toBe(12.5)
    expect(values.destination).toBe('ООО Зерно')
    expect(values.date).toBe(shipmentDateFromRequest(sample))
    expect(values.date).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
  })
})
