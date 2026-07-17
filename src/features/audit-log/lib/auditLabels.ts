import { selectOptions, type SelectOption } from '@/lib/selectOptions'

/** Humanize snake_case / kebab-case / camelCase codes for unknown values. */
export function humanizeAuditValue(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return 'Неизвестно'
  if (trimmed === 'all') return 'Все'

  const spaced = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!spaced) return 'Неизвестно'

  return spaced
    .split(' ')
    .map((part) => {
      const lower = part.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export const AUDIT_SECTION_LABELS = {
  all: 'Все разделы',
  employee: 'Сотрудники',
  shift: 'Смены',
  agro_plan: 'Агрокалендарь',
  inventory_item: 'ТМЦ',
  inventory_operation: 'Операции ТМЦ',
  inventory: 'Склад',
  expense: 'Затраты',
  expenses: 'Затраты',
  shipment: 'Отгрузки',
  shipments: 'Отгрузки',
  equipment: 'Техника',
  equipment_maintenance: 'Ремонт и ТО',
  equipment_meter_log: 'Показания',
  implement: 'Приспособления',
  implement_maintenance: 'ТО приспособления',
  employee_rate: 'Ставки',
  location: 'Объекты / поля',
  work_type: 'Типы работ',
  dictionary_item: 'Справочники',
  organization: 'Организация',
  purchase_planner: 'Планировщик закупок',
  maintenance_checklist_item: 'Чек-лист ремонта',
} as const satisfies Record<string, string>

export const AUDIT_ACTION_LABELS = {
  all: 'Все действия',
  create: 'Создание',
  created: 'Создание',
  update: 'Изменение',
  updated: 'Изменение',
  delete: 'Удаление',
  deleted: 'Удаление',
  login: 'Вход',
  logout: 'Выход',
} as const satisfies Record<string, string>

export const AUDIT_ACTION_FILTER_VALUES = ['create', 'update', 'delete'] as const

export const AUDIT_SECTION_FILTER_VALUES = [
  'employee',
  'shift',
  'agro_plan',
  'inventory_item',
  'inventory_operation',
  'expense',
  'shipment',
  'equipment',
  'equipment_maintenance',
  'equipment_meter_log',
  'implement',
  'employee_rate',
  'location',
  'work_type',
  'dictionary_item',
  'organization',
] as const

export function getAuditSectionLabel(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return 'Неизвестно'
  const key = value.trim()
  return AUDIT_SECTION_LABELS[key as keyof typeof AUDIT_SECTION_LABELS] ?? humanizeAuditValue(key)
}

export function getAuditActionLabel(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return 'Неизвестно'
  const key = value.trim().toLowerCase()
  return AUDIT_ACTION_LABELS[key as keyof typeof AUDIT_ACTION_LABELS] ?? humanizeAuditValue(value)
}

/** Actor display: prefer API name; never show raw UUID as the main label. */
export function getAuditActorLabel(
  name: string | null | undefined,
  fallbackId?: string | null,
): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  if (fallbackId?.trim()) return 'Система'
  return 'Система'
}

export function getAuditSectionFilterOptions(): SelectOption[] {
  return selectOptions([
    { value: 'all', label: getAuditSectionLabel('all') },
    ...AUDIT_SECTION_FILTER_VALUES.map((value) => ({
      value,
      label: getAuditSectionLabel(value),
    })),
  ])
}

export function getAuditActionFilterOptions(): SelectOption[] {
  return selectOptions([
    { value: 'all', label: getAuditActionLabel('all') },
    ...AUDIT_ACTION_FILTER_VALUES.map((value) => ({
      value,
      label: getAuditActionLabel(value),
    })),
  ])
}
