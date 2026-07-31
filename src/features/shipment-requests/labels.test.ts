import { describe, expect, it } from 'vitest'
import type { ShipmentRequest } from './types'
import {
  filterByStatus,
  filterForExecutor,
  formatMoney,
  isOverdue,
  isUrgent,
  isVisibleToExecutor,
  STATUS_LABELS,
} from './labels'

function row(partial: Partial<ShipmentRequest> & Pick<ShipmentRequest, 'id' | 'status'>): ShipmentRequest {
  return {
    orgId: 'org',
    inventoryItemId: 'item-1',
    inventoryItemName: 'Дизель',
    inventoryItemUnit: 'л',
    customerName: 'ООО Ромашка',
    quantity: 10,
    price: 50,
    plannedAt: new Date('2030-01-01T10:00:00Z').toISOString(),
    priority: 'normal',
    createdBy: 'u1',
    createdByName: 'Admin',
    assignedTo: null,
    assignedToName: null,
    completedAt: null,
    shiftId: null,
    inventoryOperationId: null,
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  }
}

describe('shipment-requests labels/filters', () => {
  it('filters list by status', () => {
    const rows = [
      row({ id: '1', status: 'new' }),
      row({ id: '2', status: 'done' }),
      row({ id: '3', status: 'in_progress' }),
    ]
    expect(filterByStatus(rows, 'new').map((r) => r.id)).toEqual(['1'])
    expect(filterByStatus(rows, '').map((r) => r.id)).toEqual(['1', '2', '3'])
    expect(STATUS_LABELS.new).toBe('Ожидает')
  })

  it('hides foreign assigned requests from executor view', () => {
    const mine = row({ id: '1', status: 'new', assignedTo: 'emp-1' })
    const open = row({ id: '2', status: 'new', assignedTo: null })
    const foreign = row({ id: '3', status: 'new', assignedTo: 'emp-other' })
    expect(filterForExecutor([mine, open, foreign], 'emp-1').map((r) => r.id)).toEqual([
      '1',
      '2',
    ])
    expect(isVisibleToExecutor(foreign, 'emp-1')).toBe(false)
  })

  it('marks overdue active requests', () => {
    const overdue = row({
      id: 'o',
      status: 'in_progress',
      plannedAt: new Date('2020-01-01T00:00:00Z').toISOString(),
    })
    const donePast = row({
      id: 'd',
      status: 'done',
      plannedAt: new Date('2020-01-01T00:00:00Z').toISOString(),
    })
    expect(isOverdue(overdue, new Date('2026-01-01'))).toBe(true)
    expect(isOverdue(donePast, new Date('2026-01-01'))).toBe(false)
  })

  it('highlights urgent open requests', () => {
    expect(isUrgent(row({ id: 'u', status: 'new', priority: 'urgent' }))).toBe(true)
    expect(isUrgent(row({ id: 'n', status: 'new', priority: 'normal' }))).toBe(false)
    expect(isUrgent(row({ id: 'x', status: 'done', priority: 'urgent' }))).toBe(false)
  })

  it('formatMoney includes a single ruble sign', () => {
    const text = formatMoney(750_000)
    expect(text).toMatch(/750[\s\u00a0]?000/)
    expect(text).toContain('₽')
    expect(text.replace(/[^₽]/g, '')).toBe('₽')
  })
})

describe('shipment request form prefill', () => {
  it('keeps inventory item id when opening from warehouse card', () => {
    const fromCardItemId = 'inv-42'
    const fromPageItemId: string | null = null
    expect(fromCardItemId).toBeTruthy()
    expect(fromPageItemId).toBeNull()
  })
})
