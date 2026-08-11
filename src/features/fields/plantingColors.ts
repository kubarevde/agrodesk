/** Map highlight colors for field plantings (Leaflet needs hex). */

export const DEFAULT_PLANTING_MAP_COLOR = '#01696F'

export const PLANTING_MAP_COLOR_OPTIONS: Array<{
  value: string
  label: string
  swatchClass: string
}> = [
  { value: '#01696F', label: 'Бирюзовый', swatchClass: 'bg-primary' },
  { value: '#F5C842', label: 'Золотой', swatchClass: 'bg-amber-400' },
  { value: '#F5A623', label: 'Оранжевый', swatchClass: 'bg-orange-400' },
  { value: '#8BC34A', label: 'Зелёный', swatchClass: 'bg-lime-500' },
  { value: '#437A22', label: 'Тёмно-зелёный', swatchClass: 'bg-success' },
  { value: '#3B82F6', label: 'Синий', swatchClass: 'bg-blue-500' },
  { value: '#8B5CF6', label: 'Фиолетовый', swatchClass: 'bg-violet-500' },
  { value: '#A13544', label: 'Бордовый', swatchClass: 'bg-destructive' },
  { value: '#7A7974', label: 'Серый', swatchClass: 'bg-muted-foreground' },
]

export function normalizePlantingMapColor(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toUpperCase()
  if (/^#[0-9A-F]{6}$/.test(raw)) return raw
  return DEFAULT_PLANTING_MAP_COLOR
}

export function plantingColorSwatchClass(hex: string): string {
  const found = PLANTING_MAP_COLOR_OPTIONS.find(
    (option) => option.value.toUpperCase() === hex.toUpperCase(),
  )
  return found?.swatchClass ?? 'bg-primary'
}
