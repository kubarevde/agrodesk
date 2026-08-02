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

/** Tenant list focus: API statuses + client-side unread. */
export function supportListFocusOptions(): SelectOption[] {
  return selectOptions([
    { value: 'all', label: 'Все обращения' },
    { value: 'unread', label: 'С новым ответом' },
    { value: 'waiting_user', label: 'Ждёт вашего ответа' },
    { value: 'new', label: 'Новые' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'resolved', label: 'Решённые' },
    { value: 'closed', label: 'Закрытые' },
  ])
}

export function filterSupportTicketsByFocus<
  T extends { unreadForUser: boolean; status: string },
>(tickets: T[], focus: string): T[] {
  if (focus === 'all') return tickets
  if (focus === 'unread') return tickets.filter((t) => t.unreadForUser)
  return tickets.filter((t) => t.status === focus)
}

export function categoryHint(category: string): string {
  switch (category) {
    case 'bug':
      return 'Экран сломался, ошибка или странное поведение системы.'
    case 'access':
      return 'Нет нужного раздела в меню или не хватает прав.'
    case 'data':
      return 'Данные пропали, дублируются или выглядят неверно.'
    case 'how_to':
      return 'Непонятно, как сделать действие. Сначала загляните в гайд — часто этого достаточно.'
    case 'suggestion':
      return 'Идея, как улучшить АгроДеск. Не срочный сбой.'
    case 'other':
      return 'Если ни одна категория не подходит — опишите ситуацию своими словами.'
    default:
      return ''
  }
}

export const SUPPORT_TICKET_BODY_PLACEHOLDER = `1) Раздел (например: Поля, Склад, Моя смена)
2) Что сделали по шагам
3) Что ожидали увидеть
4) Что увидели вместо этого
5) Уже смотрели гайд или справку «?» — да/нет`

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
