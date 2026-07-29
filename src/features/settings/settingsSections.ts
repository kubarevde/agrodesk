/** Settings subsections — single source for nav labels and URL tab ids. */

export const SETTINGS_TAB_IDS = [
  'crops',
  'implement-cats',
  'inventory-cats',
  'expense-cats',
  'locations',
  'work-types',
  'timezone',
  'access',
  'notifications',
] as const

export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number]

export type SettingsSection = {
  id: SettingsTabId
  label: string
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'crops', label: 'Культуры' },
  { id: 'implement-cats', label: 'Категории приспособлений' },
  { id: 'inventory-cats', label: 'Категории ТМЦ' },
  { id: 'expense-cats', label: 'Категории затрат' },
  { id: 'locations', label: 'Места работы' },
  { id: 'work-types', label: 'Типы работ' },
  { id: 'timezone', label: 'Часовой пояс' },
  { id: 'access', label: 'Доступы' },
  { id: 'notifications', label: 'Мои уведомления' },
] as const

export const DEFAULT_SETTINGS_TAB: SettingsTabId = 'crops'

export function isSettingsTabId(value: unknown): value is SettingsTabId {
  return typeof value === 'string' && (SETTINGS_TAB_IDS as readonly string[]).includes(value)
}

export function parseSettingsTab(value: unknown): SettingsTabId {
  return isSettingsTabId(value) ? value : DEFAULT_SETTINGS_TAB
}

export function getSettingsSectionLabel(id: SettingsTabId): string {
  return SETTINGS_SECTIONS.find((section) => section.id === id)?.label ?? id
}
