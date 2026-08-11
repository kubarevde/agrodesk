/**
 * System-wide RF regions catalog (not org_dictionary).
 * Codes are stable identifiers stored on organizations / sharing listings.
 */

export type RuRegion = {
  code: string
  name: string
}

/** Subjects of the Russian Federation, including new territories. */
export const RU_REGIONS: readonly RuRegion[] = [
  { code: 'RU-AD', name: 'Республика Адыгея' },
  { code: 'RU-AL', name: 'Республика Алтай' },
  { code: 'RU-BA', name: 'Республика Башкортостан' },
  { code: 'RU-BU', name: 'Республика Бурятия' },
  { code: 'RU-DA', name: 'Республика Дагестан' },
  { code: 'RU-IN', name: 'Республика Ингушетия' },
  { code: 'RU-KB', name: 'Кабардино-Балкарская Республика' },
  { code: 'RU-KL', name: 'Республика Калмыкия' },
  { code: 'RU-KC', name: 'Карачаево-Черкесская Республика' },
  { code: 'RU-KR', name: 'Республика Карелия' },
  { code: 'RU-KO', name: 'Республика Коми' },
  { code: 'RU-CR', name: 'Республика Крым' },
  { code: 'RU-ME', name: 'Республика Марий Эл' },
  { code: 'RU-MO', name: 'Республика Мордовия' },
  { code: 'RU-SA', name: 'Республика Саха (Якутия)' },
  { code: 'RU-SE', name: 'Республика Северная Осетия — Алания' },
  { code: 'RU-TA', name: 'Республика Татарстан' },
  { code: 'RU-TY', name: 'Республика Тыва' },
  { code: 'RU-UD', name: 'Удмуртская Республика' },
  { code: 'RU-KK', name: 'Республика Хакасия' },
  { code: 'RU-CE', name: 'Чеченская Республика' },
  { code: 'RU-CU', name: 'Чувашская Республика' },
  { code: 'RU-ALT', name: 'Алтайский край' },
  { code: 'RU-ZAB', name: 'Забайкальский край' },
  { code: 'RU-KAM', name: 'Камчатский край' },
  { code: 'RU-KDA', name: 'Краснодарский край' },
  { code: 'RU-KYA', name: 'Красноярский край' },
  { code: 'RU-PER', name: 'Пермский край' },
  { code: 'RU-PRI', name: 'Приморский край' },
  { code: 'RU-STA', name: 'Ставропольский край' },
  { code: 'RU-KHA', name: 'Хабаровский край' },
  { code: 'RU-AMU', name: 'Амурская область' },
  { code: 'RU-ARK', name: 'Архангельская область' },
  { code: 'RU-AST', name: 'Астраханская область' },
  { code: 'RU-BEL', name: 'Белгородская область' },
  { code: 'RU-BRY', name: 'Брянская область' },
  { code: 'RU-VLA', name: 'Владимирская область' },
  { code: 'RU-VGG', name: 'Волгоградская область' },
  { code: 'RU-VLG', name: 'Вологодская область' },
  { code: 'RU-VOR', name: 'Воронежская область' },
  { code: 'RU-DON', name: 'Донецкая Народная Республика' },
  { code: 'RU-IVA', name: 'Ивановская область' },
  { code: 'RU-IRK', name: 'Иркутская область' },
  { code: 'RU-KGD', name: 'Калининградская область' },
  { code: 'RU-KLU', name: 'Калужская область' },
  { code: 'RU-KEM', name: 'Кемеровская область — Кузбасс' },
  { code: 'RU-KIR', name: 'Кировская область' },
  { code: 'RU-KOS', name: 'Костромская область' },
  { code: 'RU-KGN', name: 'Курганская область' },
  { code: 'RU-KRS', name: 'Курская область' },
  { code: 'RU-LEN', name: 'Ленинградская область' },
  { code: 'RU-LIP', name: 'Липецкая область' },
  { code: 'RU-LUG', name: 'Луганская Народная Республика' },
  { code: 'RU-MAG', name: 'Магаданская область' },
  { code: 'RU-MOS', name: 'Московская область' },
  { code: 'RU-MUR', name: 'Мурманская область' },
  { code: 'RU-NIZ', name: 'Нижегородская область' },
  { code: 'RU-NGR', name: 'Новгородская область' },
  { code: 'RU-NVS', name: 'Новосибирская область' },
  { code: 'RU-OMS', name: 'Омская область' },
  { code: 'RU-ORE', name: 'Оренбургская область' },
  { code: 'RU-ORL', name: 'Орловская область' },
  { code: 'RU-PNZ', name: 'Пензенская область' },
  { code: 'RU-PSK', name: 'Псковская область' },
  { code: 'RU-ROS', name: 'Ростовская область' },
  { code: 'RU-RYA', name: 'Рязанская область' },
  { code: 'RU-SAM', name: 'Самарская область' },
  { code: 'RU-SAR', name: 'Саратовская область' },
  { code: 'RU-SAK', name: 'Сахалинская область' },
  { code: 'RU-SVE', name: 'Свердловская область' },
  { code: 'RU-SMO', name: 'Смоленская область' },
  { code: 'RU-TAM', name: 'Тамбовская область' },
  { code: 'RU-TVE', name: 'Тверская область' },
  { code: 'RU-TOM', name: 'Томская область' },
  { code: 'RU-TUL', name: 'Тульская область' },
  { code: 'RU-TYU', name: 'Тюменская область' },
  { code: 'RU-ULY', name: 'Ульяновская область' },
  { code: 'RU-KHE', name: 'Херсонская область' },
  { code: 'RU-CHE', name: 'Челябинская область' },
  { code: 'RU-ZAP', name: 'Запорожская область' },
  { code: 'RU-YAR', name: 'Ярославская область' },
  { code: 'RU-MOW', name: 'Москва' },
  { code: 'RU-SPE', name: 'Санкт-Петербург' },
  { code: 'RU-SEV', name: 'Севастополь' },
  { code: 'RU-YEV', name: 'Еврейская автономная область' },
  { code: 'RU-NEN', name: 'Ненецкий автономный округ' },
  { code: 'RU-KHM', name: 'Ханты-Мансийский автономный округ — Югра' },
  { code: 'RU-CHU', name: 'Чукотский автономный округ' },
  { code: 'RU-YAN', name: 'Ямало-Ненецкий автономный округ' },
] as const

const BY_CODE = new Map(RU_REGIONS.map((row) => [row.code, row.name]))
const BY_NAME = new Map(RU_REGIONS.map((row) => [row.name.toLowerCase(), row.code]))

export function regionLabel(codeOrName: string | null | undefined): string {
  if (!codeOrName) return '—'
  return BY_CODE.get(codeOrName) ?? codeOrName
}

export function regionCodeFromValue(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const trimmed = value.trim()
  if (BY_CODE.has(trimmed)) return trimmed
  return BY_NAME.get(trimmed.toLowerCase()) ?? null
}

/** Match listing/org region against a selected catalog code (supports legacy free-text names). */
export function regionMatchesFilter(
  stored: string | null | undefined,
  filterCode: string | null | undefined,
): boolean {
  if (!filterCode) return true
  if (!stored) return false
  if (stored === filterCode) return true
  const label = BY_CODE.get(filterCode)
  if (label && stored.toLowerCase() === label.toLowerCase()) return true
  return false
}

export function ruRegionSelectOptions(includeEmpty?: { value: string; label: string }) {
  const rows = RU_REGIONS.map((row) => ({ value: row.code, label: row.name }))
  return includeEmpty ? [includeEmpty, ...rows] : rows
}
