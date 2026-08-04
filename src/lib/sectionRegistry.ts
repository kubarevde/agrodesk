/** Canonical section registry — keys must match backend app/services/permissions.py */

export type AppRole = 'admin' | 'manager' | 'employee'

export type SectionDefinition = {
  key: string
  title: string
  route: string
  /** Shown in sidebar / mobile sheet */
  showInSidebar: boolean
  /** Shown as quick links on employee home */
  showInEmployeeHome: boolean
  /** Can be toggled for manager/employee in Settings → Доступы */
  employeeGrantable: boolean
  /** Always available to employee even if missing from org grants.
   * Only «Моя смена» should be true — other sections are toggled in Settings → Доступы.
   */
  alwaysVisibleForEmployee: boolean
}

export const SECTION_REGISTRY: readonly SectionDefinition[] = [
  {
    key: 'my-shift',
    title: 'Моя смена',
    route: '/my-shift',
    showInSidebar: true,
    showInEmployeeHome: false,
    employeeGrantable: true,
    alwaysVisibleForEmployee: true,
  },
  {
    key: 'dashboard',
    title: 'Дашборд',
    route: '/dashboard',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'worktime',
    title: 'Смены',
    route: '/worktime',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'agro-calendar',
    title: 'Агрокалендарь',
    route: '/agro-calendar',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'sharing',
    title: 'Шеринг',
    route: '/sharing',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    // Not locked: admin can revoke via Settings → Доступы. Only my-shift is mandatory.
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'fields',
    title: 'Поля',
    route: '/fields',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'equipment',
    title: 'Техника и приспособления',
    route: '/equipment',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'implements',
    title: 'Приспособления',
    route: '/implements',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'maintenance',
    title: 'Ремонт и обслуживание',
    route: '/maintenance',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'purchase-planner',
    title: 'Планировщик закупок',
    route: '/purchase-planner',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'inventory',
    title: 'ТМЦ',
    route: '/inventory',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'shipments',
    title: 'Отгрузки урожая',
    route: '/shipments',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'expenses',
    title: 'Затраты',
    route: '/expenses',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'analytics',
    title: 'Прогноз и оптимизация',
    route: '/analytics/forecast',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'reports',
    title: 'Отчёты',
    route: '/reports',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'employees',
    title: 'Сотрудники',
    route: '/employees',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'audit-log',
    title: 'История изменений',
    route: '/audit-log',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
  {
    key: 'settings',
    title: 'Настройки',
    route: '/settings',
    showInSidebar: true,
    showInEmployeeHome: true,
    employeeGrantable: true,
    alwaysVisibleForEmployee: false,
  },
] as const

export const SECTION_ROUTE_MAP: Record<string, string> = Object.fromEntries(
  SECTION_REGISTRY.map((s) => [s.key, s.route]),
)

/** Sections that cannot be revoked for employees (UI locked + backend baseline). Only my-shift. */
export const EMPLOYEE_LOCKED_SECTIONS: string[] = SECTION_REGISTRY.filter(
  (s) => s.alwaysVisibleForEmployee,
).map((s) => s.key)

/**
 * Default employee grants when org has no custom role_permissions.employee.
 * Includes sharing as a convenient default — still revocable in Settings.
 */
export const DEFAULT_EMPLOYEE_SECTIONS: string[] = ['my-shift', 'sharing']

export function getSectionByKey(key: string): SectionDefinition | undefined {
  return SECTION_REGISTRY.find((s) => s.key === key)
}

export function getSectionByRoute(pathname: string): SectionDefinition | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return SECTION_REGISTRY.find(
    (s) => normalized === s.route || normalized.startsWith(`${s.route}/`),
  )
}
