import { format, isValid, parseISO } from 'date-fns'
import { formatOrgDate, formatOrgDateTime } from '@/lib/timezone'

function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  // Ignore String(undefined|null) artifacts from incomplete API rows.
  if (value === 'undefined' || value === 'null' || value === 'None') return null
  const parsed = parseISO(value)
  if (isValid(parsed)) return parsed
  const fallback = new Date(value)
  return isValid(fallback) ? fallback : null
}

export function formatMoney(
  value: number,
  options?: { signed?: boolean; decimals?: number },
): string {
  const decimals = options?.decimals ?? 2
  const formatted = Number(value).toLocaleString('ru-RU', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  })
  const prefix = options?.signed && value > 0 ? '+' : ''
  return `${prefix}${formatted} ₽`
}

/** Calendar date (no wall-clock TZ shift for plain yyyy-MM-dd). */
export function formatDate(value: string | Date, timezone?: string): string {
  if (timezone) return formatOrgDate(value, timezone)
  const date = toDate(value)
  return date ? format(date, 'dd.MM.yyyy') : '—'
}

/** Instant display — pass organization timezone from useOrgTimezone(). */
export function formatDateTime(value: string | Date, timezone?: string): string {
  if (timezone) return formatOrgDateTime(value, timezone)
  const date = toDate(value)
  return date ? format(date, 'dd.MM.yyyy HH:mm') : '—'
}
