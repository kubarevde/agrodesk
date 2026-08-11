/** Shared list search helpers (ТМЦ-style client filter). */

export function normalizeSearchTerm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/** True if any haystack string contains the term (case-insensitive). Empty term → true. */
export function matchesListSearch(
  term: string,
  ...haystacks: Array<string | number | null | undefined>
): boolean {
  const needle = normalizeSearchTerm(term)
  if (!needle) return true
  return haystacks.some((raw) => {
    if (raw == null) return false
    return String(raw).toLowerCase().includes(needle)
  })
}

export function filterByListSearch<T>(
  items: T[],
  term: string,
  getHaystacks: (item: T) => Array<string | number | null | undefined>,
): T[] {
  const needle = normalizeSearchTerm(term)
  if (!needle) return items
  return items.filter((item) => matchesListSearch(needle, ...getHaystacks(item)))
}
