import axios from 'axios'
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import type { InventoryQueueItem, SyncQueueItem } from '@/types'
import { api } from './api'
import { db } from './db'
import { processInventoryQueueItem } from './inventorySyncProcess'
import { shiftFromApi } from './transformers'

const SUCCESS_STATUSES = new Set([200, 201, 204])
const MAX_RETRIES = 5

export interface FlushSyncResult {
  synced: number
  failed: number
  skipped: number
  conflicts: number
  /** Shift queue items dropped as already-resolved server conflicts (HTTP 409). */
  discarded: number
}

export type FlushSyncOptions = {
  /** Re-queue previously failed / conflict inventory + failed shift items. */
  includeFailed?: boolean
}

let flushChain: Promise<void> = Promise.resolve()

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
  await db.shifts.put({ ...serverShift, _isLocal: false })
  await remapQueuedCloseUrls(item.idempotencyKey, serverShift.id)
}

async function processSyncItem(
  item: SyncQueueItem,
): Promise<'done' | 'retry' | 'skip' | 'discarded'> {
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
      // Server already has an open shift / conflict — drop local duplicate without retry.
      await db.syncQueue.delete(item.id)
      return 'discarded'
    }

    if (response.status === 400 || response.status === 404) {
      const detail =
        response.data && typeof response.data === 'object' && 'detail' in response.data
          ? String((response.data as { detail?: unknown }).detail ?? '')
          : ''
      const alreadyDone =
        response.status === 404 || /уже закрыта|не найдена|не найден/i.test(detail)
      if (alreadyDone) {
        await db.syncQueue.delete(item.id)
        return 'done'
      }
      await db.syncQueue.update(item.id, {
        retries: (item.retries ?? 0) + 1,
        status: 'failed',
      })
      return 'retry'
    }

    return 'skip'
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      await db.syncQueue.delete(item.id)
      return 'discarded'
    }
    const retries = (item.retries ?? 0) + 1
    await db.syncQueue.update(item.id, {
      retries,
      status: retries > MAX_RETRIES ? 'failed' : 'pending',
    })
    return 'retry'
  }
}

export { processInventoryQueueItem }

async function runFlush(options: FlushSyncOptions = {}): Promise<FlushSyncResult> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, skipped: 0, conflicts: 0, discarded: 0 }
  }

  if (options.includeFailed) {
    const failedShifts = await db.syncQueue.filter((item) => item.status === 'failed').toArray()
    await Promise.all(
      failedShifts.map((item) => db.syncQueue.update(item.id, { status: 'pending', retries: 0 })),
    )
    const stuckInventory = await db.inventoryQueue
      .filter((item) => item.status === 'error' || item.status === 'conflict')
      .toArray()
    await Promise.all(
      stuckInventory.map((item) =>
        db.inventoryQueue.update(item.id, {
          status: 'pending',
          retries: 0,
          lastError: undefined,
          updatedAt: Date.now(),
        }),
      ),
    )
  }

  const shiftItems = await db.syncQueue
    .orderBy('createdAt')
    .filter((item) => (item.status ?? 'pending') === 'pending')
    .toArray()
  const inventoryItems = await db.inventoryQueue
    .orderBy('createdAt')
    .filter((item) => item.status === 'pending')
    .toArray()

  type Job =
    | { kind: 'shift'; createdAt: number; item: SyncQueueItem }
    | { kind: 'inventory'; createdAt: number; item: InventoryQueueItem }

  const jobs: Job[] = [
    ...shiftItems.map((item) => ({ kind: 'shift' as const, createdAt: item.createdAt, item })),
    ...inventoryItems.map((item) => ({
      kind: 'inventory' as const,
      createdAt: item.createdAt,
      item,
    })),
  ].sort((a, b) => a.createdAt - b.createdAt)

  let synced = 0
  let failed = 0
  let skipped = 0
  let conflicts = 0
  let discarded = 0

  for (const job of jobs) {
    if (job.kind === 'shift') {
      const result = await processSyncItem(job.item)
      if (result === 'done') synced += 1
      if (result === 'discarded') discarded += 1
      if (result === 'skip') skipped += 1
      if (result === 'retry') {
        const updated = await db.syncQueue.get(job.item.id)
        if (updated?.status === 'failed') failed += 1
      }
      continue
    }
    const result = await processInventoryQueueItem(job.item)
    if (result === 'done') synced += 1
    if (result === 'skip') skipped += 1
    if (result === 'conflict') conflicts += 1
    if (result === 'retry') {
      const updated = await db.inventoryQueue.get(job.item.id)
      if (updated?.status === 'error') failed += 1
    }
  }

  return { synced, failed, skipped, conflicts, discarded }
}

export async function flushSyncQueue(options: FlushSyncOptions = {}): Promise<FlushSyncResult> {
  const resultPromise = flushChain.then(() => runFlush(options))
  flushChain = resultPromise.then(
    () => undefined,
    () => undefined,
  )
  return resultPromise
}

/** @internal test helper */
export function __resetFlushLockForTests(): void {
  flushChain = Promise.resolve()
}

export function useSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [shifts, inventory] = await Promise.all([
        db.syncQueue.toArray(),
        db.inventoryQueue.toArray(),
      ])
      return {
        pendingCount:
          shifts.filter((item) => (item.status ?? 'pending') === 'pending').length +
          inventory.filter((item) => item.status === 'pending').length,
        failedCount:
          shifts.filter((item) => item.status === 'failed').length +
          inventory.filter((item) => item.status === 'error').length,
        conflictCount: inventory.filter((item) => item.status === 'conflict').length,
      }
    }).subscribe({
      next: (counts) => {
        setPendingCount(counts.pendingCount)
        setFailedCount(counts.failedCount)
        setConflictCount(counts.conflictCount)
      },
      error: () => {
        setPendingCount(0)
        setFailedCount(0)
        setConflictCount(0)
      },
    })
    return () => subscription.unsubscribe()
  }, [])

  return { pendingCount, failedCount, conflictCount }
}
