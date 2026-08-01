export const LANDING_NAV = [
  { id: 'day', label: 'День хозяйства' },
  { id: 'roles', label: 'Роли' },
  { id: 'modules', label: 'Модули' },
  { id: 'telegram', label: 'Telegram' },
] as const

/** Segment CTAs on the landing — keep data-landing-segment hooks for analytics. */
export const LANDING_SEGMENTS = [
  { id: 'farm', label: 'Управление хозяйством', to: '/login' },
  { id: 'eco', label: 'Купить экопродукцию', to: '/market' },
] as const

export const LANDING_IMAGES = {
  hero: `${import.meta.env.BASE_URL}landing/hero-field.webp`,
  /** Field-day narrative photo — must stay distinct from module cards. */
  day: `${import.meta.env.BASE_URL}landing/day-field.webp`,
  shifts: `${import.meta.env.BASE_URL}landing/module-shifts.webp`,
  warehouse: `${import.meta.env.BASE_URL}landing/module-warehouse.webp`,
  calendar: `${import.meta.env.BASE_URL}landing/module-calendar.webp`,
} as const

export function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
