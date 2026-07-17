export const CATEGORY_LABELS: Record<string, string> = {
  equipment: 'Техника',
  implement: 'Приспособление',
  inventory_item: 'ТМЦ',
  general: 'Общее',
}

export const URGENCY_LABELS: Record<string, string> = {
  urgent: 'Срочно',
  normal: 'Обычный',
  low: 'Низкий',
}

export const STATUS_LABELS: Record<string, string> = {
  planned: 'Запланировано',
  purchased: 'Куплено',
  cancelled: 'Отменено',
}

export function urgencyBadgeClass(urgency: string): string {
  if (urgency === 'urgent') return 'border-destructive/40 bg-destructive/10 text-destructive'
  if (urgency === 'low') return 'border-border bg-muted text-muted-foreground'
  return 'border-primary/30 bg-primary/5 text-primary'
}

export function statusBadgeClass(status: string): string {
  if (status === 'purchased') return 'border-success/40 bg-success/10 text-success'
  if (status === 'cancelled') return 'border-border bg-muted text-muted-foreground'
  return 'border-amber-500/40 bg-amber-500/10 text-amber-700'
}
