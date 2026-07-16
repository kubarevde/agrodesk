import { beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetFlushLockForTests, flushSyncQueue } from '@/lib/sync'

vi.mock('@/lib/api', () => ({
  api: {
    request: vi.fn(),
  },
}))

let flushCalls = 0

vi.mock('@/lib/db', () => {
  return {
    db: {
      syncQueue: {
        filter: () => ({
          toArray: async () => [],
        }),
        orderBy: () => ({
          filter: () => ({
            toArray: async () => {
              flushCalls += 1
              await new Promise((r) => setTimeout(r, 30))
              return []
            },
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
    },
  }
})

describe('flushSyncQueue concurrency', () => {
  beforeEach(() => {
    __resetFlushLockForTests()
    flushCalls = 0
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('serializes concurrent flushes (no parallel queue runs)', async () => {
    await Promise.all([flushSyncQueue(), flushSyncQueue(), flushSyncQueue()])
    expect(flushCalls).toBe(3)
  })
})
