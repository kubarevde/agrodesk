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
  'purchase.create',
  'purchase.manage',
  'support.view_org_tickets',
  'shipment_requests.manage',
  'shipment_requests.execute',
  'marketplace.manage',
] as const

export type PermissionAction = (typeof ACTION_KEYS)[number]

export const ACTION_LABELS: Record<PermissionAction, string> = {
  'shift.open_own': 'Открыть свою смену',
  'shift.open_for_others': 'Открыть смену за другого',
  'shift.close_own': 'Закрыть свою смену',
  'shift.close_others': 'Закрыть чужую смену',
  'inventory.operate': 'Приход / расход / корректировка ТМЦ',
  'inventory.manage_items': 'Управление позициями склада',
  'purchase.create': 'Создавать заявки на закупку',
  'purchase.manage': 'Управлять закупками (удаление, затраты)',
  'support.view_org_tickets': 'Видеть все обращения организации',
  'shipment_requests.manage': 'Управлять заявками на отгрузку ТМЦ',
  'shipment_requests.execute': 'Исполнять заявки на отгрузку ТМЦ',
  'marketplace.manage': 'Управлять витриной маркетплейса (импорт и объявления)',
}

/** Employee-safe baselines when a section is granted (matches backend SECTION_IMPLIED_ACTIONS). */
export const SECTION_IMPLIED_ACTIONS: Record<string, readonly PermissionAction[]> = {
  'my-shift': ['shift.open_own', 'shift.close_own'],
  worktime: ['shift.open_own', 'shift.close_own'],
  inventory: ['inventory.operate'],
  'purchase-planner': ['purchase.create'],
  shipments: ['shipment_requests.execute'],
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
      (action) => !implied.has(action as PermissionAction) || stillImplied.has(action as PermissionAction),
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
