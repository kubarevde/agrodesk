import { format, isValid, parseISO } from 'date-fns'
import { formatDateTime } from '@/lib/format'

/** Parse ISO calendar day `yyyy-MM-dd` as local date (no TZ shift). */
export function parseIsoDate(iso: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return isValid(date) ? date : undefined
}

/** Format Date as ISO calendar day `yyyy-MM-dd` (local calendar). */
export function formatIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Convert ISO date `yyyy-MM-dd` to display `dd.MM.yyyy` without timezone shift. */
export function isoDateToDisplay(iso: string): string {
  const parsed = parseIsoDate(iso)
  if (!parsed) return iso
  return format(parsed, 'dd.MM.yyyy')
}

/** Convert ISO datetime to display `dd.MM.yyyy HH:mm`. */
export function isoDateTimeToDisplay(iso: string): string {
  const parsed = parseISO(iso)
  if (isValid(parsed)) return formatDateTime(parsed)
  return formatDateTime(iso)
}
