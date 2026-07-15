import { format, isValid, parseISO } from 'date-fns'
import { formatDateTime } from '@/lib/format'

/** Convert ISO date `yyyy-MM-dd` to display `dd.MM.yyyy` without timezone shift. */
export function isoDateToDisplay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return format(new Date(year, month - 1, day), 'dd.MM.yyyy')
}

/** Convert ISO datetime to display `dd.MM.yyyy HH:mm`. */
export function isoDateTimeToDisplay(iso: string): string {
  const parsed = parseISO(iso)
  if (isValid(parsed)) return formatDateTime(parsed)
  return formatDateTime(iso)
}
