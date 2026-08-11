import { PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS } from './labels'

export { PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS }

export function formatMoney(value: number | null | undefined): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const normalized = Object.is(n, -0) ? 0 : n
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(normalized)
}

/** @deprecated Prefer formatPayrollPeriod from `@/features/payroll/labels`. */
export function formatPeriod(start: string, end: string): string {
  const fmt = (iso: string) => {
    const parts = iso.split('-')
    if (parts.length < 3) return '—'
    const [y, m, d] = parts
    return `${d}.${m}.${y}`
  }
  if (!start || !end) return '—'
  return `${fmt(start)} — ${fmt(end)}`
}
