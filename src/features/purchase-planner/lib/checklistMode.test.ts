import { describe, expect, it } from 'vitest'
import { sortForChecklist, purchaseContextLabel, CHECKLIST_STATUS_LABELS } from './checklistMode'
import type { PurchasePlannerItem } from '../types'

function item(partial: Partial<PurchasePlannerItem>): PurchasePlannerItem {
  return {
    id: '1',
    orgId: 'o',
    title: 'Test',
    category: 'general',
    equipmentId: null,
    implementId: null,
    inventoryItemId: null,
    equipmentName: null,
    implementName: null,
    inventoryItemName: null,
    linkedLabel: null,
    urgency: 'normal',
    status: 'planned',
    purchasePlace: null,
    responsibleId: null,
    responsibleName: null,
    estimatedCost: null,
    actualCost: null,
    expenseId: null,
    maintenanceChecklistItemId: null,
    maintenanceId: null,
    maintenanceAssetLabel: null,
    notes: null,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    purchasedAt: null,
    ...partial,
  }
}

describe('sortForChecklist', () => {
  it('sorts urgent items first', () => {
    const sorted = sortForChecklist([
      item({ id: 'a', urgency: 'low', title: 'low' }),
      item({ id: 'b', urgency: 'urgent', title: 'urgent' }),
      item({ id: 'c', urgency: 'normal', title: 'normal' }),
    ])
    expect(sorted.map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('purchaseContextLabel', () => {
  it('shows repair context when maintenance linked', () => {
    expect(
      purchaseContextLabel(
        item({ maintenanceId: 'm1', maintenanceAssetLabel: 'Трактор МТЗ' }),
      ),
    ).toBe('Для ремонта: Трактор МТЗ')
  })
})

describe('CHECKLIST_STATUS_LABELS', () => {
  it('maps planned to shopper-friendly label', () => {
    expect(CHECKLIST_STATUS_LABELS.planned).toBe('К покупке')
  })
})
