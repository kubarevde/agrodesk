/**
 * Shared dictionary label resolution for finance / forms / tables.
 * Prefer live dictionary rows; fall back to stored value for history.
 */

export type DictionaryLabelRow = {
  code: string
  name: string
  is_active?: boolean
}

/**
 * Legacy seed codes → Russian names.
 * Used ONLY when the org dictionary is missing a row (offline / pre-seed edge)
 * or for historical expense codes that predate custom categories.
 */
export const LEGACY_EXPENSE_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  fuel: 'Топливо',
  fertilizer: 'Удобрения',
  parts: 'Запчасти',
  salary: 'Зарплата',
  rent: 'Аренда',
  other: 'Прочее',
}

export function resolveDictionaryLabel(
  value: string | null | undefined,
  dictionary?: DictionaryLabelRow[],
  legacyMap?: Readonly<Record<string, string>>,
): string {
  if (!value) return ''
  const fromDict = dictionary?.find((row) => row.code === value || row.name === value)
  if (fromDict) return fromDict.name
  if (legacyMap?.[value]) return legacyMap[value]
  return value
}

/** Build select options from active dictionary; keep orphan historical value for edit. */
export function buildDictionarySelectOptions(
  dictionary: DictionaryLabelRow[],
  options?: {
    valueKey?: 'code' | 'name'
    orphanValue?: string | null
    orphanLabel?: string
  },
): Array<{ value: string; label: string }> {
  const valueKey = options?.valueKey ?? 'code'
  const rows = dictionary.map((row) => ({
    value: valueKey === 'code' ? row.code : row.name,
    label: row.name,
  }))
  const orphan = options?.orphanValue
  if (orphan && !rows.some((row) => row.value === orphan)) {
    return [
      {
        value: orphan,
        label: options?.orphanLabel ?? resolveDictionaryLabel(orphan, dictionary),
      },
      ...rows,
    ]
  }
  return rows
}
