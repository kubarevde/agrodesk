import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import type { SyncQueueItem } from '@/types'
import { db } from './db'

const TOKEN_KEY = 'agrodesk_token'

async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    'Idempotency-Key': item.idempotencyKey,
  }

  if (item.method !== 'DELETE') {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(item.url, {
    method: item.method,
    headers,
    body: item.method !== 'DELETE' ? JSON.stringify(item.body) : undefined,
  })

  return response.ok
}

export async function flushSyncQueue(): Promise<void> {
  if (!navigator.onLine) return

  const items = await db.syncQueue.orderBy('createdAt').toArray()

  for (const item of items) {
    try {
      const success = await processSyncItem(item)
      if (success) {
        await db.syncQueue.delete(item.id)
      }
    } catch {
      // Keep failed items in the queue for the next retry.
    }
  }
}

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const subscription = liveQuery(() => db.syncQueue.count()).subscribe({
      next: setPendingCount,
      error: () => setPendingCount(0),
    })

    return () => subscription.unsubscribe()
  }, [])

  return { pendingCount }
}
