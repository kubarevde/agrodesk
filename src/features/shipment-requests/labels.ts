import { formatMoney as formatMoneyBase } from '@/lib/format'
import type { ShipmentRequest, ShipmentRequestStatus } from './types'

export const STATUS_LABELS: Record<ShipmentRequestStatus, string> = {
  new: 'Ожидает',
  in_progress: 'В работе',
  done: 'Выполнено',
  cancelled: 'Отменено',
}

export const PRIORITY_LABELS = {
  normal: 'Обычный',
  urgent: 'Срочный',
} as const

export function isTerminalStatus(status: ShipmentRequestStatus): boolean {
  return status === 'done' || status === 'cancelled'
}

/** planned_at in the past and not finished/cancelled. */
export function isOverdue(row: ShipmentRequest, now = new Date()): boolean {
  if (isTerminalStatus(row.status)) return false
  const planned = new Date(row.plannedAt)
  if (Number.isNaN(planned.getTime())) return false
  return planned.getTime() < now.getTime()
}

export function isUrgent(row: ShipmentRequest): boolean {
  return row.priority === 'urgent' && !isTerminalStatus(row.status)
}

/** Executor may see unassigned rows or those assigned to them. */
export function isVisibleToExecutor(row: ShipmentRequest, employeeId: string): boolean {
  return row.assignedTo == null || row.assignedTo === employeeId
}

export function filterForExecutor(
  rows: ShipmentRequest[],
  employeeId: string,
): ShipmentRequest[] {
  return rows.filter((row) => isVisibleToExecutor(row, employeeId))
}

export function canStartRequest(row: ShipmentRequest): boolean {
  return row.status === 'new'
}

export function canCompleteRequest(row: ShipmentRequest): boolean {
  return row.status === 'in_progress'
}

/** Client-side filter helpers (also used when API already filtered). */
export function filterByStatus(
  rows: ShipmentRequest[],
  status: ShipmentRequestStatus | '' | undefined,
): ShipmentRequest[] {
  if (!status) return rows
  return rows.filter((row) => row.status === status)
}

/** Money for shipment-request UI — always includes a single ₽. */
export function formatMoney(value: number): string {
  return formatMoneyBase(value)
}

export function formatPlannedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Default planned_at: tomorrow 09:00 local as ISO. */
export function defaultPlannedAtIso(from = new Date()): string {
  const next = new Date(from)
  next.setDate(next.getDate() + 1)
  next.setHours(9, 0, 0, 0)
  return next.toISOString()
}
