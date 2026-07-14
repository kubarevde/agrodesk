import axios from 'axios'
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import type { SyncQueueItem } from '@/types'
import { api } from './api'
import { db } from './db'
import { shiftFromApi } from './transformers'

const SUCCESS_STATUSES = new Set([200, 201, 204])

async function remapQueuedCloseUrls(localId: string, serverId: string): Promise<void> {
  const pending = await db.syncQueue
    .filter((item) => item.url.includes(`/api/shifts/${localId}/`))
    .toArray()

  await Promise.all(
    pending.map((item) =>
      db.syncQueue.update(item.id, {
        url: item.url.replace(`/api/shifts/${localId}/`, `/api/shifts/${serverId}/`),
      }),
    ),
  )
}

async function handleSuccessfulShiftCreate(
  item: SyncQueueItem,
  responseData: unknown,
): Promise<void> {
  if (item.method !== 'POST' || item.url !== '/api/shifts') return
  if (!responseData || typeof responseData !== 'object') return

  const serverShift = shiftFromApi(responseData as Record<string, unknown>)
  await db.shifts.delete(item.idempotencyKey)
  await db.shifts.put(serverShift)
  await remapQueuedCloseUrls(item.idempotencyKey, serverShift.id)
}

async function processSyncItem(item: SyncQueueItem): Promise<'done' | 'retry' | 'skip'> {
  try {
    const response = await api.request<unknown>({
      method: item.method,
      url: item.url,
      data: item.method !== 'DELETE' ? item.body : undefined,
      headers: { 'X-Idempotency-Key': item.idempotencyKey },
      validateStatus: (status) =>
        SUCCESS_STATUSES.has(status) || status === 409 || status < 500,
    })

    if (SUCCESS_STATUSES.has(response.status)) {
      await handleSuccessfulShiftCreate(item, response.data)
      await db.syncQueue.delete(item.id)
      return 'done'
    }

    if (response.status === 409) {
      await db.syncQueue.delete(item.id)
      return 'done'
    }

    // Other client errors: leave in queue without burning retries
    return 'skip'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      await db.syncQueue.delete(item.id)
      return 'done'
    }

    // Network / server errors → increment retries
    const retries = (item.retries ?? 0) + 1
    await db.syncQueue.update(item.id, {
      retries,
      status: retries > 5 ? 'failed' : 'pending',
    })
    return 'retry'
  }
}

export interface FlushSyncResult {
  synced: number
  failed: number
}

export async function flushSyncQueue(): Promise<FlushSyncResult> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 }
  }

  const items = await db.syncQueue
    .orderBy('createdAt')
    .filter((item) => (item.status ?? 'pending') === 'pending')
    .toArray()

  let synced = 0
  let failed = 0

  for (const item of items) {
    const result = await processSyncItem(item)
    if (result === 'done') synced += 1
    if (result === 'retry') {
      const updated = await db.syncQueue.get(item.id)
      if (updated?.status === 'failed') failed += 1
    }
  }

  return { synced, failed }
}

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const items = await db.syncQueue.toArray()
      return {
        pendingCount: items.filter((item) => (item.status ?? 'pending') === 'pending').length,
        failedCount: items.filter((item) => item.status === 'failed').length,
      }
    }).subscribe({
      next: ({ pendingCount: pending, failedCount: failed }) => {
        setPendingCount(pending)
        setFailedCount(failed)
      },
      error: () => {
        setPendingCount(0)
        setFailedCount(0)
      },
    })

    return () => subscription.unsubscribe()
  }, [])

  return { pendingCount, failedCount }
}
