export type PlantingStatus =
  | 'planned'
  | 'planted'
  | 'partially_harvested'
  | 'harvested'
  | 'cancelled'

export type FieldPlanting = {
  id: string
  fieldId: string
  cropCode: string
  cropName: string | null
  varietyId: string | null
  varietyName: string | null
  areaHa: number
  plantedAt: string | null
  harvestedAt: string | null
  status: PlantingStatus
  seasonYear: number
  comment: string | null
  polygon: number[][] | null
  mapColor: string
  harvestedQty: number | null
  yieldKgPerHa: number | null
  hasHarvest: boolean
  cropLocked: boolean
  requestedQty: number | null
  shippedQty: number | null
}

export type FieldPlantingsSummary = {
  fieldId: string
  fieldAreaHa: number | null
  seasonYear: number
  allocatedHa: number
  remainingHa: number | null
  legacyCropCode: string | null
  legacyCropType: string | null
  legacyNote: string | null
}

export type FieldPlantingWrite = {
  crop_code: string
  variety_id?: string | null
  area_ha: number
  planted_at?: string | null
  harvested_at?: string | null
  status?: PlantingStatus
  season_year: number
  comment?: string | null
  polygon?: number[][] | null
  map_color?: string | null
  clear_variety?: boolean
  occupies_whole_field?: boolean
}

export const PLANTING_STATUS_LABELS: Record<PlantingStatus, string> = {
  planned: 'Запланировано',
  planted: 'Посеяно',
  partially_harvested: 'Частично убрано',
  harvested: 'Убрано',
  cancelled: 'Отменено',
}

export function formatYield(yieldKgPerHa: number | null | undefined): string | null {
  if (yieldKgPerHa == null || !Number.isFinite(yieldKgPerHa) || yieldKgPerHa <= 0) {
    return null
  }
  if (yieldKgPerHa >= 1000) {
    return `${(yieldKgPerHa / 1000).toFixed(2)} т/га`
  }
  return `${yieldKgPerHa.toFixed(1)} кг/га`
}

export function formatAreaHa(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Number(value.toFixed(2))} га`
}
