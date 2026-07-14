const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string | null | undefined): boolean {
  if (!value?.trim()) return false
  return UUID_RE.test(value.trim())
}

/** Hide raw UUIDs in UI — show a readable fallback instead. */
export function humanLabel(
  value: string | null | undefined,
  fallback = 'Без названия',
): string {
  const trimmed = value?.trim()
  if (!trimmed || isUuid(trimmed)) return fallback
  return trimmed
}

export function joinLabels(
  parts: Array<string | null | undefined>,
  separator = ' + ',
  fallback = '—',
): string {
  const labels = parts.map((part) => humanLabel(part, '')).filter(Boolean)
  return labels.length > 0 ? labels.join(separator) : fallback
}
