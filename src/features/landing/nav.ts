export const LANDING_NAV = [
  { id: 'day', label: 'День хозяйства' },
  { id: 'roles', label: 'Роли' },
  { id: 'modules', label: 'Модули' },
  { id: 'telegram', label: 'Telegram' },
] as const

export const LANDING_IMAGES = {
  hero: `${import.meta.env.BASE_URL}landing/hero-field.webp`,
  shifts: `${import.meta.env.BASE_URL}landing/module-shifts.webp`,
  warehouse: `${import.meta.env.BASE_URL}landing/module-warehouse.webp`,
  calendar: `${import.meta.env.BASE_URL}landing/module-calendar.webp`,
} as const

export function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
