import { format, isValid, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { isUuid } from '@/lib/display'
import { ACTION_LABELS } from '@/lib/permissionActions'
import { getSectionByKey } from '@/lib/sectionRegistry'
import { getAuditActionLabel, humanizeAuditValue } from './auditLabels'
import { getAuditFieldLabel, isTechnicalAuditField } from './auditFieldLabels'
import type { AuditLogEntry } from '../types'

export type AuditChangeRow = {
  field: string
  label: string
  from: string | null
  to: string | null
  isTechnical: boolean
  /** Original technical key — for tooltip / debug. */
  rawField: string
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
  // shifts
  open: 'Открыта',
  closed: 'Закрыта',
  // purchase / agro / maintenance
  planned: 'Запланировано',
  purchased: 'Куплено',
  cancelled: 'Отменено',
  in_progress: 'В работе',
  waiting_parts: 'Ожидает запчасти',
  done: 'Выполнено',
}

const OPERATION_TYPE_LABELS: Record<string, string> = {
  income: 'Приход',
  expense: 'Расход',
  adjustment: 'Корректировка',
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
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  parts: 'Запчасти',
  seeds: 'Семена',
  chemicals: 'Химия',
  other: 'Прочее',
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

const KIND_LABELS: Record<string, string> = {
  field: 'Поле',
  object: 'Объект',
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

const DATE_FIELDS = new Set([
  'date',
  'planned_date',
  'planned_end_date',
  'valid_from',
  'valid_to',
  'purchased_at',
  'date_returned',
  'done_at',
])

const DATETIME_FIELDS = new Set(['created_at', 'updated_at', 'changed_at', 'trial_ends_at'])

const TIME_FIELDS = new Set(['start_time', 'end_time'])

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

function formatCatalogKey(key: string): string {
  const section = getSectionByKey(key)
  if (section) return section.title
  if (key in ACTION_LABELS) return ACTION_LABELS[key as keyof typeof ACTION_LABELS]
  return humanizeAuditValue(key)
}

function formatStringList(values: unknown[]): string {
  if (values.length === 0) return '—'
  return values
    .map((item) => {
      if (typeof item === 'string') return formatCatalogKey(item)
      try {
        return JSON.stringify(item)
      } catch {
        return String(item)
      }
    })
    .join(', ')
}

function mapKnownEnum(field: string, trimmed: string, entityType?: string | null): string | null {
  if (field === 'role') return ROLE_LABELS[trimmed] ?? null
  if (field === 'urgency' || field === 'priority') return URGENCY_LABELS[trimmed] ?? null
  if (field === 'item_type') return ITEM_TYPE_LABELS[trimmed] ?? null
  if (field === 'payment_method') return PAYMENT_LABELS[trimmed] ?? null
  if (field === 'kind') return KIND_LABELS[trimmed] ?? null
  if (field === 'category') return CATEGORY_LABELS[trimmed] ?? null

  if (field === 'type') {
    if (entityType === 'inventory_operation') {
      return OPERATION_TYPE_LABELS[trimmed] ?? null
    }
    return OPERATION_TYPE_LABELS[trimmed] ?? null
  }

  if (field === 'status') {
    if (entityType === 'agro_plan' && trimmed === 'planned') return 'Запланирован'
    if (entityType === 'purchase_planner' && trimmed === 'planned') return 'К покупке'
    return STATUS_LABELS[trimmed] ?? null
  }

  return null
}

export function formatAuditValue(
  field: string,
  value: unknown,
  entityType?: string | null,
): string {
  if (isEmpty(value)) return '—'

  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'

  if (typeof value === 'number') {
    if (MONEY_FIELDS.has(field)) return formatMoney(value)
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
  }

  if (Array.isArray(value)) {
    if (field === 'sections' || field === 'actions') return formatStringList(value)
    return formatStringList(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '—'

    const mapped = mapKnownEnum(field, trimmed, entityType)
    if (mapped) return mapped

    if (TIME_FIELDS.has(field) && /^\d{1,2}:\d{2}/.test(trimmed)) {
      return trimmed.length >= 8 ? trimmed.slice(0, 8) : trimmed
    }

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
  entityType?: string | null,
): AuditChangeRow | null {
  const fromRaw = before?.[field]
  const toRaw = after?.[field]
  const from = fromRaw === undefined ? null : formatAuditValue(field, fromRaw, entityType)
  const to = toRaw === undefined ? null : formatAuditValue(field, toRaw, entityType)
  if (from === to) return null

  return {
    field,
    rawField: field,
    label: getAuditFieldLabel(field, entityType),
    from,
    to,
    isTechnical: isTechnicalAuditField(field),
  }
}

export function buildAuditChangeRows(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  entityType?: string | null,
): AuditChangeRow[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  const rows: AuditChangeRow[] = []
  for (const field of [...keys].sort()) {
    const row = buildRow(field, before, after, entityType)
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
  entityType?: string | null,
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
      row.to === '—' && rawTo !== undefined
        ? formatTechnicalRaw(rawTo)
        : row.to,
    label: getAuditFieldLabel(row.field, entityType),
  }
}

export function buildAuditDetailSections(entry: AuditLogEntry): AuditDetailSections {
  const action = entry.action.toLowerCase()
  const entityType = entry.entityType
  const allRows = buildAuditChangeRows(entry.beforeData, entry.afterData, entityType)

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
    .map((row) => enrichTechnicalRow(row, entry.beforeData, entry.afterData, entityType))

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
