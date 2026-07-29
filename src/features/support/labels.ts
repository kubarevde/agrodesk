import type { SelectOption } from '@/lib/selectOptions'
import { selectOptions } from '@/lib/selectOptions'
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_ROLE_LABELS,
  SUPPORT_STATUS_STAFF,
  SUPPORT_STATUS_USER,
  SUPPORT_STATUSES,
} from './types'

export function categoryLabel(value: string): string {
  return SUPPORT_CATEGORIES[value as keyof typeof SUPPORT_CATEGORIES] ?? value
}

export function statusLabel(value: string, audience: 'user' | 'staff' = 'user'): string {
  if (audience === 'staff') {
    return SUPPORT_STATUS_STAFF[value] ?? SUPPORT_STATUSES[value as keyof typeof SUPPORT_STATUSES] ?? value
  }
  return SUPPORT_STATUS_USER[value] ?? SUPPORT_STATUSES[value as keyof typeof SUPPORT_STATUSES] ?? value
}

export function priorityLabel(value: string): string {
  return SUPPORT_PRIORITIES[value as keyof typeof SUPPORT_PRIORITIES] ?? value
}

export function roleLabel(value: string): string {
  return SUPPORT_ROLE_LABELS[value] ?? value
}

/** Options for Base UI Select (`items`) — labels are Russian, values stay machine codes. */
export function supportCategoryOptions(includeAll = false): SelectOption[] {
  const base = Object.entries(SUPPORT_CATEGORIES).map(([value, label]) => ({ value, label }))
  return selectOptions(
    includeAll ? [{ value: 'all', label: 'Все категории' }, ...base] : base,
  )
}

export function supportPriorityOptions(includeAll = false): SelectOption[] {
  const base = Object.entries(SUPPORT_PRIORITIES).map(([value, label]) => ({ value, label }))
  return selectOptions(
    includeAll ? [{ value: 'all', label: 'Все приоритеты' }, ...base] : base,
  )
}

export function supportStatusOptions(
  audience: 'user' | 'staff' = 'user',
  includeAll = false,
): SelectOption[] {
  const base = Object.keys(SUPPORT_STATUSES).map((value) => ({
    value,
    label: statusLabel(value, audience),
  }))
  return selectOptions(
    includeAll ? [{ value: 'all', label: 'Все статусы' }, ...base] : base,
  )
}

export function supportSortOptions(): SelectOption[] {
  return selectOptions([
    { value: 'updated', label: 'По дате обновления' },
    { value: 'status', label: 'По статусу' },
  ])
}

export function supportScopeOptions(): SelectOption[] {
  return selectOptions([
    { value: 'all', label: 'Все обращения' },
    { value: 'unread', label: 'Только непрочитанные' },
    { value: 'mine', label: 'Только мои' },
  ])
}

export function supportRoleFilterOptions(): SelectOption[] {
  return selectOptions([
    { value: 'all', label: 'Все роли' },
    ...Object.entries(SUPPORT_ROLE_LABELS).map(([value, label]) => ({ value, label })),
  ])
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'new':
      return 'bg-primary/10 text-primary'
    case 'in_progress':
      return 'bg-muted text-foreground'
    case 'waiting_user':
      return 'bg-destructive/10 text-destructive'
    case 'resolved':
      return 'bg-success/15 text-success'
    case 'closed':
      return 'bg-muted text-muted-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function priorityBadgeClass(priority: string): string {
  return priority === 'high'
    ? 'bg-destructive/10 text-destructive'
    : 'bg-muted text-muted-foreground'
}
