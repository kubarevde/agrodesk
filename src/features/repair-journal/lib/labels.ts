import type { RepairPriority, RepairStatus } from '../types'

/** Fallback labels when org dictionary is unavailable. */
export const STATUS_LABELS: Record<string, string> = {
  in_progress: 'В ремонте',
  waiting_parts: 'Ожидает запчасти',
  done: 'Завершён',
  cancelled: 'Отменён',
  // Legacy code kept for history display only.
  open: 'Открыт',
}

/** Actively being repaired (legacy `open` mapped to in_progress). */
export const IN_REPAIR_STATUSES = new Set(['in_progress', 'open'])
export const WAITING_PARTS_STATUS = 'waiting_parts'
export const CLOSED_REPAIR_STATUSES = new Set(['done', 'cancelled'])

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Срочно',
  normal: 'Обычный',
  low: 'Низкий',
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  buy: 'Купить',
  repair: 'Отремонтировать',
}

export function isInRepair(entry: { status: string }): boolean {
  return IN_REPAIR_STATUSES.has(entry.status)
}

export function isWaitingPartsStatus(status: string): boolean {
  return status === WAITING_PARTS_STATUS
}

/** Needs attention on cards: in repair and/or waiting for parts. */
export function isActiveRepair(entry: {
  status: string
  waitingParts?: boolean
}): boolean {
  return (
    isInRepair(entry) ||
    isWaitingPartsStatus(entry.status) ||
    Boolean(entry.waitingParts)
  )
}

export function getStatusBadgeClass(status: RepairStatus | string): string {
  if (status === 'done') return 'border-success/40 bg-success/10 text-success'
  if (status === 'cancelled') return 'border-border bg-muted text-muted-foreground'
  if (status === WAITING_PARTS_STATUS) return getWaitingPartsBadgeClass()
  return 'border-destructive/40 bg-destructive/10 text-destructive'
}

export function getWaitingPartsBadgeClass(): string {
  return 'border-amber-500/40 bg-amber-500/10 text-amber-700'
}

export function getPriorityBadgeClass(priority: RepairPriority | string): string {
  if (priority === 'urgent') return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (priority === 'low') return 'border-border bg-muted text-muted-foreground'
  return 'border-primary/30 bg-primary/5 text-primary'
}

export function shouldShowRepairPriority(entry: {
  status: string
  waitingParts?: boolean
}): boolean {
  // Hide priority on completed repairs that are not waiting for parts.
  if (entry.status === 'done' && !entry.waitingParts) return false
  return true
}

export function repairStatusLabel(
  status: string,
  dict?: ReadonlyArray<{ code: string; name: string }> | null,
): string {
  const fromDict = dict?.find((item) => item.code === status)?.name
  return fromDict ?? STATUS_LABELS[status] ?? status
}
