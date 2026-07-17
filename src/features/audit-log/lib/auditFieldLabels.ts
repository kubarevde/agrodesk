import { humanizeAuditValue } from './auditLabels'

export const AUDIT_FIELD_LABELS = {
  created_at: 'Дата создания',
  updated_at: 'Дата изменения',
  changed_at: 'Дата изменения',
  employee_code: 'Код сотрудника',
  full_name: 'ФИО',
  hourly_rate: 'Ставка в час',
  org_id: 'Организация',
  is_active: 'Активен',
  role: 'Роль',
  position: 'Должность',
  telegram_id: 'Telegram ID',
  notes: 'Комментарий',
  description: 'Описание',
  category: 'Категория',
  amount: 'Сумма',
  date: 'Дата',
  supplier: 'Поставщик',
  payment_method: 'Способ оплаты',
  equipment_id: 'Техника',
  implement_id: 'Приспособление',
  employee_id: 'Сотрудник',
  work_type_id: 'Тип работ',
  location_id: 'Объект / поле',
  field_id: 'Поле',
  planned_date: 'Плановая дата',
  planned_end_date: 'Дата окончания',
  status: 'Статус',
  name: 'Название',
  type: 'Тип',
  quantity_kg: 'Количество, кг',
  price_per_kg: 'Цена за кг',
  destination: 'Направление',
  crop_type: 'Культура',
  current_stock: 'Остаток',
  min_stock: 'Мин. запас',
  unit: 'Ед. изм.',
  cost: 'Стоимость',
  meter_type: 'Тип счётчика',
  current_meter: 'Текущий показатель',
  to_interval: 'Интервал ТО',
  serial_number: 'Серийный номер',
  year_of_manufacture: 'Год выпуска',
  rate: 'Ставка',
  overtime_threshold_hours: 'Порог переработки, ч',
  overtime_multiplier: 'Множитель переработки',
  valid_from: 'Действует с',
  valid_to: 'Действует до',
  created_by: 'Создал',
  title: 'Название',
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
  date_returned: 'Дата возврата в строй',
  priority: 'Приоритет',
  item_type: 'Тип пункта',
  is_done: 'Выполнено',
  done_at: 'Дата выполнения',
  meter_at: 'Показания на момент ремонта',
} as const satisfies Record<string, string>

const TECHNICAL_FIELDS = new Set([
  'id',
  'org_id',
  'password_hash',
  'created_by',
  'entity_id',
  'changed_by',
])

const TECHNICAL_SUFFIXES = ['_id', '_hash']

export function getAuditFieldLabel(field: string): string {
  const key = field.trim()
  return AUDIT_FIELD_LABELS[key as keyof typeof AUDIT_FIELD_LABELS] ?? humanizeAuditValue(key)
}

export function isTechnicalAuditField(field: string): boolean {
  const key = field.trim().toLowerCase()
  if (TECHNICAL_FIELDS.has(key)) return true
  if (key.endsWith('_id') && key !== 'telegram_id') return true
  return TECHNICAL_SUFFIXES.some((suffix) => key.endsWith(suffix))
}
