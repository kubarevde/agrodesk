/**
 * Display-only mapping of technical audit codes → Russian labels.
 * Stored DB values (entity_type, enum codes, snapshot keys) stay unchanged;
 * UI looks codes up here. Extend this map when a new code appears in history.
 */

/** Exact technical tokens (entity types, enums, field-like codes). */
export const AUDIT_CODE_LABELS: Record<string, string> = {
  // ── entity types / sections ──────────────────────────────────────────
  employee: 'Сотрудник',
  shift: 'Смена',
  agro_plan: 'Агрокалендарь',
  inventory_item: 'ТМЦ',
  inventory_operation: 'Операция ТМЦ',
  inventory: 'Склад',
  expense: 'Затрата',
  expenses: 'Затраты',
  shipment: 'Отгрузка',
  shipments: 'Отгрузки',
  shipment_request: 'Заявка на отгрузку',
  tmc_shipment: 'Отгрузка ТМЦ',
  equipment: 'Техника',
  equipment_maintenance: 'Ремонт и ТО',
  equipment_meter_log: 'Показания счётчика',
  implement: 'Приспособление',
  implement_maintenance: 'ТО приспособления',
  implement_usage_log: 'Наработка приспособления',
  employee_rate: 'Ставка оплаты',
  location: 'Объект / поле',
  work_type: 'Тип работ',
  dictionary_item: 'Справочник',
  organization: 'Организация',
  purchase_planner: 'Планировщик закупок',
  maintenance_checklist_item: 'Пункт чек-листа ремонта',
  access_group: 'Группа доступа',
  support_ticket: 'Обращение в поддержку',
  chat: 'Чат',
  holding_session: 'Сессия холдинга',

  // ── actions (aliases) ────────────────────────────────────────────────
  create: 'Создание',
  created: 'Создание',
  update: 'Изменение',
  updated: 'Изменение',
  delete: 'Удаление',
  deleted: 'Удаление',
  login: 'Вход',
  logout: 'Выход',

  // ── common enum / free-text codes in snapshots ───────────────────────
  harvest: 'Урожай',
  price: 'Цена',
  new: 'Новый',
  open: 'Открыта',
  closed: 'Закрыта',
  planned: 'Запланировано',
  purchased: 'Куплено',
  cancelled: 'Отменено',
  in_progress: 'В работе',
  waiting_parts: 'Ожидает запчасти',
  done: 'Выполнено',
  income: 'Приход',
  adjustment: 'Корректировка',
  urgent: 'Срочно',
  normal: 'Обычный',
  low: 'Низкий',
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  parts: 'Запчасти',
  seeds: 'Семена',
  chemicals: 'СЗР',
  other: 'Прочее',
  general: 'Общее',
  buy: 'Купить',
  repair: 'Отремонтировать',
  cash: 'Наличные',
  transfer: 'Перевод',
  invoice: 'Счёт',
  field: 'Поле',
  object: 'Объект',
  opening: 'Начальный остаток',
  refuel: 'Заправка',
  install: 'Установка',
  harvest_income: 'Сбор урожая с поля',
  motohours: 'Моточасы',
  km: 'Километры',
  shift_hours: 'Часы смен',
  admin: 'Администратор',
  manager: 'Менеджер',
  true: 'Да',
  false: 'Нет',
  all: 'Все',
}

/**
 * English sentence-case forms produced by legacy humanize
 * (e.g. shipment_request → "Shipment request") — still rewrite on display.
 */
export const AUDIT_ENGLISH_PHRASE_LABELS: Record<string, string> = {
  'Shipment request': 'Заявка на отгрузку',
  'Tmc shipment': 'Отгрузка ТМЦ',
  'Inventory item': 'ТМЦ',
  'Inventory operation': 'Операция ТМЦ',
  'Agro plan': 'Агрокалендарь',
  'Employee rate': 'Ставка оплаты',
  'Purchase planner': 'Планировщик закупок',
  'Equipment maintenance': 'Ремонт и ТО',
  'Equipment meter log': 'Показания счётчика',
  'Implement maintenance': 'ТО приспособления',
  'Implement usage log': 'Наработка приспособления',
  'Dictionary item': 'Справочник',
  'Work type': 'Тип работ',
  'Access group': 'Группа доступа',
  'Support ticket': 'Обращение в поддержку',
  'Holding session': 'Сессия холдинга',
  'Maintenance checklist item': 'Пункт чек-листа ремонта',
  'In progress': 'В работе',
  'Waiting parts': 'Ожидает запчасти',
  'Harvest income': 'Сбор урожая с поля',
  'Shift hours': 'Часы смен',
  Price: 'Цена',
  Harvest: 'Урожай',
  New: 'Новый',
  Open: 'Открыта',
  Closed: 'Закрыта',
  Planned: 'Запланировано',
  Done: 'Выполнено',
  Cancelled: 'Отменено',
  Fuel: 'Топливо',
  Seeds: 'Семена',
  Parts: 'Запчасти',
  Chemicals: 'СЗР',
  Fertilizer: 'Удобрения',
  Other: 'Прочее',
  General: 'Общее',
  Urgent: 'Срочно',
  Normal: 'Обычный',
  Income: 'Приход',
  Expense: 'Расход',
  Adjustment: 'Корректировка',
  Motohours: 'Моточасы',
  Admin: 'Администратор',
  Manager: 'Менеджер',
  Employee: 'Сотрудник',
  Create: 'Создание',
  Update: 'Изменение',
  Delete: 'Удаление',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Lookup a single technical code (case-insensitive for ASCII enums). */
export function getAuditCodeLabel(code: string): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null
  if (AUDIT_CODE_LABELS[trimmed]) return AUDIT_CODE_LABELS[trimmed]
  const lower = trimmed.toLowerCase()
  if (AUDIT_CODE_LABELS[lower]) return AUDIT_CODE_LABELS[lower]
  return null
}

/**
 * Rewrite known technical tokens inside a stored summary string.
 * Does not mutate DB — display only. Longer keys applied first.
 */
export function localizeAuditSummary(summary: string | null | undefined): string {
  if (summary == null) return '—'
  const trimmed = summary.trim()
  if (!trimmed) return '—'

  let out = trimmed

  const phrases = Object.entries(AUDIT_ENGLISH_PHRASE_LABELS).sort(
    (a, b) => b[0].length - a[0].length,
  )
  for (const [phrase, label] of phrases) {
    out = out.replace(new RegExp(escapeRegExp(phrase), 'g'), label)
  }

  const codes = Object.entries(AUDIT_CODE_LABELS).sort((a, b) => b[0].length - a[0].length)
  for (const [code, label] of codes) {
    // Skip ultra-short ambiguous tokens that appear inside Russian words / numbers.
    if (code.length < 3) continue
    out = out.replace(new RegExp(`(?<![\\wа-яА-ЯёЁ])${escapeRegExp(code)}(?![\\wа-яА-ЯёЁ])`, 'gi'), label)
  }

  return out
}
