export const DEFAULT_ORG_TIMEZONE = 'Asia/Bangkok'

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? new Date(value) : value
}

/** Format instant for display in organization timezone (Intl, no extra deps). */
export function formatInOrgTimezone(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
  timezone: string = DEFAULT_ORG_TIMEZONE,
): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return String(value)
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: timezone || DEFAULT_ORG_TIMEZONE,
      ...options,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: DEFAULT_ORG_TIMEZONE,
      ...options,
    }).format(date)
  }
}

export function formatOrgDateTime(value: string | Date, timezone?: string): string {
  return formatInOrgTimezone(
    value,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    },
    timezone,
  )
}

export function formatOrgDate(value: string | Date, timezone?: string): string {
  return formatInOrgTimezone(
    value,
    { day: '2-digit', month: '2-digit', year: 'numeric' },
    timezone,
  )
}
