import { format, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { isUuid } from '@/lib/display'
import { getAuditActionLabel } from './auditLabels'
import { getAuditFieldLabel, isTechnicalAuditField } from './auditFieldLabels'
import type { AuditLogEntry } from '../types'

export type AuditChangeRow = {
  field: string
  label: string
  from: string | null
  to: string | null
  isTechnical: boolean
}

export type AuditDetailSections = {
  action: string
  actionLabel: string
  fieldsTitle: string
  mainRows: AuditChangeRow[]
  technicalRows: AuditChangeRow[]
}

const ROLE_LABELS: Record<string, string> = {
  employee: 'Сотрудник',
  manager: 'Менеджер',
  admin: 'Администратор',
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'К покупке',
  purchased: 'Куплено',
  cancelled: 'Отменено',
  in_progress: 'В ремонте',
  waiting_parts: 'Ожидает запчасти',
  done: 'Готово',
  open: 'Открыта',
  closed: 'Закрыта',
}

const URGENCY_LABELS: Record<string, string> = {
  urgent: 'Срочно',
  normal: 'Обычный',
  low: 'Низкий',
}

const CATEGORY_LABELS: Record<string, string> = {
  equipment: 'Техника',
  implement: 'Приспособление',
  inventory_item: 'ТМЦ',
  general: 'Общее',
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  buy: 'Купить',
  repair: 'Отремонтировать',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Наличные',
  transfer: 'Перевод',
  invoice: 'Счёт',
}

const MONEY_FIELDS = new Set([
  'amount',
  'hourly_rate',
  'rate',
  'cost',
  'actual_cost',
  'estimated_cost',
  'price_per_kg',
  'calculated_amount',
  'total_capacity',
])

const DATE_FIELDS = new Set(['date', 'planned_date', 'planned_end_date', 'valid_from', 'valid_to'])

const DATETIME_FIELDS = new Set(['created_at', 'updated_at', 'changed_at'])

function isEmpty(value: unknown): boolean {
  return value == null || value === ''
}

function formatMoney(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ₽'
}

function tryFormatIsoDate(value: string): string | null {
  const parsed = parseISO(value)
  if (!isValid(parsed)) return null
  if (/T\d{2}:\d{2}/.test(value)) {
    return format(parsed, 'dd.MM.yyyy HH:mm', { locale: ru })
  }
  return format(parsed, 'dd.MM.yyyy', { locale: ru })
}

export function formatAuditValue(field: string, value: unknown): string {
  if (isEmpty(value)) return '—'

  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'

  if (typeof value === 'number') {
    if (MONEY_FIELDS.has(field)) return formatMoney(value)
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '—'

    if (field === 'role') return ROLE_LABELS[trimmed] ?? trimmed
    if (field === 'status') return STATUS_LABELS[trimmed] ?? trimmed
    if (field === 'urgency') return URGENCY_LABELS[trimmed] ?? trimmed
    if (field === 'category') return CATEGORY_LABELS[trimmed] ?? trimmed
    if (field === 'item_type') return ITEM_TYPE_LABELS[trimmed] ?? trimmed
    if (field === 'priority') return URGENCY_LABELS[trimmed] ?? trimmed
    if (field === 'payment_method') return PAYMENT_LABELS[trimmed] ?? trimmed

    if (DATETIME_FIELDS.has(field) || DATE_FIELDS.has(field)) {
      const formatted = tryFormatIsoDate(trimmed)
      if (formatted) return formatted
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const formatted = tryFormatIsoDate(trimmed)
      if (formatted) return formatted
    }

    if (isUuid(trimmed)) return '—'

    if (trimmed === 'true') return 'Да'
    if (trimmed === 'false') return 'Нет'

    return trimmed
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 0)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function buildRow(
  field: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChangeRow | null {
  const fromRaw = before?.[field]
  const toRaw = after?.[field]
  const from = fromRaw === undefined ? null : formatAuditValue(field, fromRaw)
  const to = toRaw === undefined ? null : formatAuditValue(field, toRaw)
  if (from === to) return null

  return {
    field,
    label: getAuditFieldLabel(field),
    from,
    to,
    isTechnical: isTechnicalAuditField(field),
  }
}

export function buildAuditChangeRows(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChangeRow[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const rows: AuditChangeRow[] = []
  for (const field of [...keys].sort()) {
    const row = buildRow(field, before, after)
    if (row) rows.push(row)
  }
  return rows
}

function fieldsTitleForAction(action: string): string {
  const key = action.toLowerCase()
  if (key === 'create' || key === 'created') return 'Созданные значения'
  if (key === 'delete' || key === 'deleted') return 'Удалённые данные'
  return 'Изменённые поля'
}

function formatTechnicalRaw(value: unknown): string {
  if (isEmpty(value)) return '—'
  if (typeof value === 'string' && isUuid(value.trim())) {
    const id = value.trim()
    return `${id.slice(0, 8)}…`
  }
  return formatAuditValue('id', value)
}

function enrichTechnicalRow(
  row: AuditChangeRow,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChangeRow {
  const rawFrom = before?.[row.field]
  const rawTo = after?.[row.field]
  return {
    ...row,
    from:
      row.from === '—' && rawFrom !== undefined
        ? formatTechnicalRaw(rawFrom)
        : row.from,
    to:
      row.to === '—' && rawTo !== undefined ? formatTechnicalRaw(rawTo) : row.to,
  }
}

export function buildAuditDetailSections(entry: AuditLogEntry): AuditDetailSections {
  const action = entry.action.toLowerCase()
  const allRows = buildAuditChangeRows(entry.beforeData, entry.afterData)

  let shaped: AuditChangeRow[]
  if (action === 'create' || action === 'created') {
    shaped = allRows.map((row) => ({ ...row, from: null }))
  } else if (action === 'delete' || action === 'deleted') {
    shaped = allRows.map((row) => ({ ...row, to: null }))
  } else {
    shaped = allRows.filter((row) => row.from !== row.to)
  }

  const technicalRows = shaped
    .filter((row) => row.isTechnical)
    .map((row) => enrichTechnicalRow(row, entry.beforeData, entry.afterData))

  let mainRows = shaped.filter((row) => !row.isTechnical)

  if (action === 'create' || action === 'created') {
    mainRows = mainRows.filter((row) => row.to != null && row.to !== '—')
  } else if (action === 'delete' || action === 'deleted') {
    mainRows = mainRows.filter((row) => row.from != null && row.from !== '—')
  }

  return {
    action,
    actionLabel: getAuditActionLabel(entry.action),
    fieldsTitle: fieldsTitleForAction(action),
    mainRows,
    technicalRows,
  }
}
