import { format, isValid, parseISO } from 'date-fns'
import { formatOrgDate, formatOrgDateTime } from '@/lib/timezone'

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const parsed = parseISO(value)
  if (isValid(parsed)) return parsed
  return new Date(value)
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
  return format(toDate(value), 'dd.MM.yyyy')
}

/** Instant display — pass organization timezone from useOrgTimezone(). */
export function formatDateTime(value: string | Date, timezone?: string): string {
  if (timezone) return formatOrgDateTime(value, timezone)
  return format(toDate(value), 'dd.MM.yyyy HH:mm')
}
