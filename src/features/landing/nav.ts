export const LANDING_NAV = [
  { id: 'features', label: 'Возможности' },
  { id: 'how', label: 'Как работает' },
  { id: 'audience', label: 'Для кого' },
] as const

export function scrollToSection(id: string): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
