import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetFlushLockForTests, flushSyncQueue } from '@/lib/sync'
import type { SyncQueueItem } from '@/types'

const pendingItem: SyncQueueItem = {
  id: 'q-1',
  method: 'POST',
  url: '/api/shifts',
  body: { employee_id: 'e1' },
  idempotencyKey: 'local-shift-1',
  createdAt: Date.now(),
  retries: 0,
  status: 'pending',
}

const deletedIds: string[] = []
const apiRequest = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    request: (...args: unknown[]) => apiRequest(...args),
  },
}))

vi.mock('@/lib/db', () => {
  return {
    db: {
      syncQueue: {
        filter: () => ({
          toArray: async () => [],
        }),
        orderBy: () => ({
          filter: () => ({
            toArray: async () => [pendingItem],
          }),
        }),
        update: async () => undefined,
        get: async () => undefined,
        delete: async (id: string) => {
          deletedIds.push(id)
        },
      },
      inventoryQueue: {
        filter: () => ({
          toArray: async () => [],
        }),
        orderBy: () => ({
          filter: () => ({
            toArray: async () => [],
          }),
        }),
        update: async () => undefined,
        get: async () => undefined,
        delete: async () => undefined,
      },
      shifts: {
        delete: async () => undefined,
        put: async () => undefined,
      },
      inventory: {
        get: async () => undefined,
        put: async () => undefined,
      },
    },
  }
})

describe('flushSyncQueue shift 409 discard', () => {
  beforeEach(() => {
    __resetFlushLockForTests()
    deletedIds.length = 0
    apiRequest.mockReset()
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('counts discarded and removes queue item on HTTP 409', async () => {
    apiRequest.mockResolvedValue({ status: 409, data: { detail: 'Already open' } })

    const result = await flushSyncQueue()

    expect(result).toEqual({
      synced: 0,
      failed: 0,
      skipped: 0,
      conflicts: 0,
      discarded: 1,
    })
    expect(deletedIds).toEqual(['q-1'])
  })

  it('counts synced on successful create', async () => {
    apiRequest.mockResolvedValue({
      status: 201,
      data: {
        id: 'server-1',
        date: '01.08.2026',
        employee_id: 'e1',
        employee_code: 'EMP1',
        employee_name: 'Test',
        telegram_id: '',
        start_time: '08:00:00',
        end_time: null,
        work_type: 'Поле',
        location: 'Поле 1',
        equipment: '',
        description: '',
        comment: '',
        status: 'open',
        duration_raw: null,
        duration_rounded: null,
        latitude: null,
        longitude: null,
      },
    })

    const result = await flushSyncQueue()

    expect(result.synced).toBe(1)
    expect(result.discarded).toBe(0)
    expect(deletedIds).toContain('q-1')
  })
})
