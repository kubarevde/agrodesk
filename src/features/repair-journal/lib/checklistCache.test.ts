import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { applyChecklistDoneToCaches } from './checklistCache'
import type { RepairJournalEntry } from '../types'

function entry(partial: Partial<RepairJournalEntry> & Pick<RepairJournalEntry, 'id'>): RepairJournalEntry {
  return {
    equipmentId: null,
    implementId: null,
    equipmentName: null,
    implementName: null,
    assetLabel: 'Трактор',
    date: '2026-01-01',
    type: 'Ремонт',
    description: null,
    status: 'in_progress',
    waitingParts: false,
    priority: 'normal',
    dateReturned: null,
    meterAt: null,
    cost: null,
    expenseId: null,
    checklistItems: [],
    checklistDone: 0,
    checklistTotal: 0,
    createdAt: null,
    ...partial,
  }
}

describe('applyChecklistDoneToCaches', () => {
  it('toggles item and counters in list caches', () => {
    const qc = new QueryClient()
    const list = [
      entry({
        id: 'r1',
        checklistItems: [
          {
            id: 'i1',
            maintenanceId: 'r1',
            itemType: 'buy',
            description: 'Ремень',
            isDone: false,
            cost: null,
            doneAt: null,
            createdAt: null,
          },
        ],
        checklistDone: 0,
        checklistTotal: 1,
      }),
    ]
    qc.setQueryData(['repair-journal', {}], list)

    applyChecklistDoneToCaches(qc, 'i1', true)

    const next = qc.getQueryData<RepairJournalEntry[]>(['repair-journal', {}])
    expect(next?.[0]?.checklistItems[0]?.isDone).toBe(true)
    expect(next?.[0]?.checklistDone).toBe(1)
  })

  it('ignores unrelated cache shapes safely', () => {
    const qc = new QueryClient()
    qc.setQueryData(['repair-journal', 'other'], { foo: 1 })
    applyChecklistDoneToCaches(qc, 'i1', true)
    expect(qc.getQueryData(['repair-journal', 'other'])).toEqual({ foo: 1 })
  })
})
