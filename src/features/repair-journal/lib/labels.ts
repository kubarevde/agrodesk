import type { RepairPriority, RepairStatus } from '../types'

export const STATUS_LABELS: Record<string, string> = {
  in_progress: 'В ремонте',
  waiting_parts: 'Ожидает запчасти',
  done: 'Готово',
}

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Срочно',
  normal: 'Обычный',
  low: 'Низкий',
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  buy: 'Купить',
  repair: 'Отремонтировать',
}

export function getStatusBadgeClass(status: RepairStatus | string): string {
  if (status === 'done') return 'border-success/40 bg-success/10 text-success'
  if (status === 'waiting_parts') return 'border-amber-500/40 bg-amber-500/10 text-amber-700'
  return 'border-destructive/40 bg-destructive/10 text-destructive'
}

export function getPriorityBadgeClass(priority: RepairPriority | string): string {
  if (priority === 'urgent') return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (priority === 'low') return 'border-border bg-muted text-muted-foreground'
  return 'border-primary/30 bg-primary/5 text-primary'
}
