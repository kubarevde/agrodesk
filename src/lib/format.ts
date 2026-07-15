import { format, isValid, parseISO } from 'date-fns'

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

export function formatDate(value: string | Date): string {
  return format(toDate(value), 'dd.MM.yyyy')
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), 'dd.MM.yyyy HH:mm')
}
