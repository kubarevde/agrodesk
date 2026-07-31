/**
 * Central field-label map for audit history UI.
 * Keys are technical snapshot keys from before_data / after_data.
 * Extend AUDIT_FIELD_LABELS for global names; use AUDIT_ENTITY_FIELD_LABELS
 * for entity-specific overrides (entity_type → field → label).
 *
 * Raw technical keys stay available via tooltip / «Технические данные».
 */
import { humanizeAuditFieldName } from './auditLabels'

/** Global labels — apply to any entity unless overridden below. */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  // common
  created_at: 'Дата создания',
  updated_at: 'Дата изменения',
  changed_at: 'Дата изменения',
  org_id: 'Организация',
  is_active: 'Активен',
  name: 'Название',
  title: 'Название',
  description: 'Описание',
  notes: 'Комментарий',
  comment: 'Комментарий',
  status: 'Статус',
  type: 'Тип',
  category: 'Категория',
  date: 'Дата',
  created_by: 'Создал',

  // employee
  employee_code: 'Код сотрудника',
  full_name: 'ФИО',
  hourly_rate: 'Ставка в час',
  role: 'Роль',
  position: 'Должность',
  telegram_id: 'Telegram ID',
  access_group_id: 'Группа доступа',

  // shift
  start_time: 'Время начала',
  end_time: 'Время окончания',
  duration_raw: 'Длительность (факт)',
  duration_rounded: 'Длительность (округл.)',
  latitude: 'Широта',
  longitude: 'Долгота',
  calculated_amount: 'Начислено',
  rate_snapshot: 'Снимок ставки',
  employee_id: 'Сотрудник',
  work_type_id: 'Тип работ',
  location_id: 'Объект / поле',
  field_id: 'Поле',
  equipment_id: 'Техника',
  implement_id: 'Приспособление',
  agro_plan_id: 'План агрокалендаря',

  // agro plan
  planned_date: 'Плановая дата',
  planned_end_date: 'Дата окончания',

  // inventory
  current_stock: 'Остаток',
  min_stock: 'Мин. запас',
  total_capacity: 'Ёмкость / объём',
  unit: 'Ед. изм.',
  quantity: 'Количество',
  stock_after: 'Остаток после операции',
  reason: 'Причина',
  purpose: 'Назначение',
  supplier: 'Поставщик',
  cost: 'Стоимость',
  item_id: 'Позиция склада',

  // expenses / shipments
  amount: 'Сумма',
  payment_method: 'Способ оплаты',
  quantity_kg: 'Количество, кг',
  price_per_kg: 'Цена за кг',
  destination: 'Направление',
  crop_type: 'Культура',
  crop_code: 'Культура',

  // equipment / maintenance
  meter_type: 'Тип счётчика',
  current_meter: 'Текущий показатель',
  to_interval: 'Интервал ТО',
  serial_number: 'Серийный номер',
  year_of_manufacture: 'Год выпуска',
  date_returned: 'Дата возврата в строй',
  priority: 'Приоритет',
  item_type: 'Тип пункта',
  is_done: 'Выполнено',
  done_at: 'Дата выполнения',
  meter_at: 'Показания на момент ремонта',

  // rates
  rate: 'Ставка',
  overtime_threshold_hours: 'Порог переработки, ч',
  overtime_multiplier: 'Множитель переработки',
  valid_from: 'Действует с',
  valid_to: 'Действует до',

  // purchase planner
  urgency: 'Срочность',
  actual_cost: 'Фактическая стоимость',
  estimated_cost: 'Примерная стоимость',
  purchase_place: 'Место покупки',
  purchased_at: 'Дата покупки',
  maintenance_id: 'Связанный ремонт',
  maintenance_checklist_item_id: 'Пункт чек-листа ремонта',
  inventory_item_id: 'Позиция склада',
  responsible_id: 'Ответственный',
  expense_id: 'Связанная затрата',
  images: 'Фотографии',

  // access group
  code: 'Код',
  is_system: 'Системная группа',
  sections: 'Разделы',
  actions: 'Действия',

  // organization
  slug: 'Код организации',
  plan: 'Тариф',
  owner_email: 'Email владельца',
  trial_ends_at: 'Окончание триала',
  max_employees: 'Лимит сотрудников',
  settings: 'Настройки организации',

  // location / field extras
  kind: 'Тип объекта',
  area_ha: 'Площадь, га',
  polygon: 'Контур поля',
  soil_type: 'Тип почвы',
}

/**
 * Optional per-entity overrides: `entity_type.field_name` semantics.
 * Example: shift.status stays «Статус», agro_plan.status could differ later.
 */
export const AUDIT_ENTITY_FIELD_LABELS: Record<string, Record<string, string>> = {
  shift: {
    status: 'Статус смены',
    date: 'Дата смены',
    comment: 'Комментарий к смене',
  },
  inventory_operation: {
    type: 'Тип операции',
    date: 'Дата операции',
  },
  inventory_item: {
    category: 'Категория ТМЦ',
  },
  employee: {
    role: 'Роль в системе',
    is_active: 'Активен в организации',
  },
  access_group: {
    name: 'Название группы',
    sections: 'Доступные разделы',
    actions: 'Разрешённые действия',
  },
  purchase_planner: {
    status: 'Статус закупки',
    category: 'Категория закупки',
  },
  agro_plan: {
    status: 'Статус плана',
  },
  organization: {
    settings: 'Права ролей и параметры',
  },
}

const TECHNICAL_FIELDS = new Set([
  'id',
  'org_id',
  'password_hash',
  'created_by',
  'entity_id',
  'changed_by',
])

const TECHNICAL_SUFFIXES = ['_id', '_hash']

export function getAuditFieldLabel(field: string, entityType?: string | null): string {
  const key = field.trim()
  if (!key) return 'Поле'

  if (entityType) {
    const scoped = AUDIT_ENTITY_FIELD_LABELS[entityType]?.[key]
    if (scoped) return scoped
  }

  return AUDIT_FIELD_LABELS[key] ?? humanizeAuditFieldName(key)
}

export function isTechnicalAuditField(field: string): boolean {
  const key = field.trim().toLowerCase()
  if (TECHNICAL_FIELDS.has(key)) return true
  if (key.endsWith('_id') && key !== 'telegram_id') return true
  return TECHNICAL_SUFFIXES.some((suffix) => key.endsWith(suffix))
}
