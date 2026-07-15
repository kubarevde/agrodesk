import { format } from 'date-fns'

/** Preview pay for threshold+2 hours: regular + 2h overtime. */
export function formatRateCalculator(
  rate: number,
  threshold: number,
  multiplier: number,
): string {
  const safeRate = Number.isFinite(rate) ? rate : 0
  const safeThreshold = Number.isFinite(threshold) ? threshold : 8
  const safeMultiplier = Number.isFinite(multiplier) ? multiplier : 1
  const overtimeH = 2
  const regularSum = Math.round(safeThreshold * safeRate * 100) / 100
  const overtimeSum = Math.round(overtimeH * safeRate * safeMultiplier * 100) / 100
  const total = Math.round((regularSum + overtimeSum) * 100) / 100
  return `${safeRate}₽ × ${safeThreshold}ч + ${overtimeH}ч × ${safeRate}₽ × ${safeMultiplier} = ${total}₽`
}

export function formatMoney(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`
}

export function formatIsoDateRu(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}.${m}.${y}`
}

export function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
