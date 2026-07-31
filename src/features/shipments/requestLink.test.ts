import { describe, expect, it } from 'vitest'
import { harvestRequestOptionLabel, shortRequestRef } from './requestLink'
import type { ShipmentRequest } from '@/features/shipment-requests/types'

const sample = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  customerName: 'ООО Зерно',
  inventoryItemName: 'Пшеница склад',
  quantity: 100,
} as ShipmentRequest

describe('shipment request link helpers', () => {
  it('builds option label with short id', () => {
    expect(harvestRequestOptionLabel(sample)).toContain('abcdef12')
    expect(harvestRequestOptionLabel(sample)).toContain('ООО Зерно')
  })

  it('shortens request id for badges', () => {
    expect(shortRequestRef(sample.id)).toBe('abcdef12')
  })
})
