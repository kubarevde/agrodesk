/**
 * Level-2 action keys — keep in sync with backend/app/services/action_permissions.py
 *
 * Priority (same as backend):
 * 1. admin → all
 * 2. employee.access_group → group sections + actions replace role defaults
 * 3. else → role_permissions sections + implied actions
 */

export const ACTION_KEYS = [
  'shift.open_own',
  'shift.open_for_others',
  'shift.close_own',
  'shift.close_others',
  'inventory.operate',
  'inventory.manage_items',
  'inventory.delete_or_archive',
  'purchase.create',
  'purchase.manage',
  'support.view_org_tickets',
  'shipment_requests.manage',
  'shipment_requests.execute',
  'marketplace.manage',
  'holding.view',
  'holding.switch',
  'payroll.manage_rates',
  'payroll.confirm',
  'payroll.pay',
  'payroll.view_all',
  'tasks.create',
  'tasks.manage',
  'tasks.complete_own',
  'tasks.complete_general',
  'tasks.view_all',
] as const

export type PermissionAction = (typeof ACTION_KEYS)[number]

export const ACTION_LABELS: Record<PermissionAction, string> = {
  'shift.open_own': 'Открыть свою смену',
  'shift.open_for_others': 'Открыть смену за другого',
  'shift.close_own': 'Закрыть свою смену',
  'shift.close_others': 'Закрыть чужую смену',
  'inventory.operate': 'Приход / расход / корректировка ТМЦ',
  'inventory.manage_items': 'Управление позициями склада',
  'inventory.delete_or_archive': 'Удалять и архивировать позиции ТМЦ',
  'purchase.create': 'Создавать заявки на закупку',
  'purchase.manage': 'Управлять закупками (удаление, затраты)',
  'support.view_org_tickets': 'Видеть все обращения организации',
  'shipment_requests.manage': 'Управлять заявками на отгрузку ТМЦ',
  'shipment_requests.execute': 'Исполнять заявки на отгрузку ТМЦ',
  'marketplace.manage': 'Управлять витриной маркетплейса (импорт и объявления)',
  'holding.view': 'Обзор дочерних КФХ (holding)',
  'holding.switch': 'Переключение в дочернюю КФХ (holding)',
  'payroll.manage_rates': 'Управлять ставками и схемами оплаты сотрудников',
  'payroll.confirm': 'Подтверждать начисление зарплаты',
  'payroll.pay': 'Фиксировать выдачу зарплаты',
  'payroll.view_all': 'Видеть начисления и выдачи всех сотрудников',
  'tasks.create': 'Создавать задачи',
  'tasks.manage': 'Управлять всеми задачами',
  'tasks.complete_own': 'Отмечать выполненными свои задачи',
  'tasks.complete_general': 'Отмечать выполненными общие задачи',
  'tasks.view_all': 'Видеть все задачи организации',
}

/** UI grouping for Settings → Доступы (action checkboxes). */
export const ACTION_UI_GROUPS: readonly {
  id: string
  label: string
  actions: readonly PermissionAction[]
}[] = [
  {
    id: 'shift',
    label: 'Смены',
    actions: [
      'shift.open_own',
      'shift.open_for_others',
      'shift.close_own',
      'shift.close_others',
    ],
  },
  {
    id: 'inventory',
    label: 'Склад',
    actions: [
      'inventory.operate',
      'inventory.manage_items',
      'inventory.delete_or_archive',
    ],
  },
  {
    id: 'purchase',
    label: 'Закупки',
    actions: ['purchase.create', 'purchase.manage'],
  },
  {
    id: 'support',
    label: 'Поддержка',
    actions: ['support.view_org_tickets'],
  },
  {
    id: 'shipment_requests',
    label: 'Заявки на отгрузку',
    actions: ['shipment_requests.manage', 'shipment_requests.execute'],
  },
  {
    id: 'marketplace',
    label: 'Маркетплейс',
    actions: ['marketplace.manage'],
  },
  {
    id: 'holding',
    label: 'Холдинг',
    actions: ['holding.view', 'holding.switch'],
  },
  {
    id: 'payroll',
    label: 'Оплата труда',
    actions: [
      'payroll.manage_rates',
      'payroll.confirm',
      'payroll.pay',
      'payroll.view_all',
    ],
  },
  {
    id: 'tasks',
    label: 'Задачи',
    actions: [
      'tasks.create',
      'tasks.manage',
      'tasks.complete_own',
      'tasks.complete_general',
      'tasks.view_all',
    ],
  },
] as const

/** Employee-safe baselines when a section is granted (matches backend SECTION_IMPLIED_ACTIONS). */
export const SECTION_IMPLIED_ACTIONS: Record<string, readonly PermissionAction[]> = {
  'my-shift': ['shift.open_own', 'shift.close_own'],
  worktime: ['shift.open_own', 'shift.close_own'],
  inventory: ['inventory.operate'],
  'purchase-planner': ['purchase.create'],
  shipments: ['shipment_requests.execute'],
  tasks: ['tasks.complete_own'],
}

export function impliedActionsForSections(sections: string[]): PermissionAction[] {
  const seen = new Set<PermissionAction>()
  const result: PermissionAction[] = []
  for (const section of sections) {
    for (const action of SECTION_IMPLIED_ACTIONS[section] ?? []) {
      if (!seen.has(action)) {
        seen.add(action)
        result.push(action)
      }
    }
  }
  return result
}

/** Merge section toggle: add/remove employee-safe implied actions for that section. */
export function syncActionsWithSectionToggle(
  sections: string[],
  actions: string[],
  toggledSection: string,
  enabled: boolean,
): { sections: string[]; actions: string[] } {
  const nextSections = enabled
    ? sections.includes(toggledSection)
      ? sections
      : [...sections, toggledSection]
    : sections.filter((s) => s !== toggledSection)

  const implied = new Set(SECTION_IMPLIED_ACTIONS[toggledSection] ?? [])
  let nextActions = [...actions]

  if (enabled) {
    for (const action of implied) {
      if (!nextActions.includes(action)) nextActions.push(action)
    }
  } else {
    const stillImplied = new Set(impliedActionsForSections(nextSections))
    nextActions = nextActions.filter(
      (action) =>
        !implied.has(action as PermissionAction) ||
        stillImplied.has(action as PermissionAction),
    )
  }

  return { sections: nextSections, actions: nextActions }
}

export function hasAction(
  actions: string[] | undefined,
  action: PermissionAction,
  role?: string,
): boolean {
  if (role === 'admin') return true
  return Boolean(actions?.includes(action))
}

export function hasSection(
  sections: string[] | undefined,
  section: string,
  role?: string,
): boolean {
  if (role === 'admin') return true
  return Boolean(sections?.includes(section))
}
