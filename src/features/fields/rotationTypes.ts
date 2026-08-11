export type RotationFulfillment = 'pending' | 'fulfilled' | 'partial'

export type RotationMatrixCell = {
  kind: 'plan' | 'fact'
  id: string
  cropCode: string
  cropName: string | null
  varietyId: string | null
  varietyName: string | null
  areaHa: number
  status: string
  fulfillment: RotationFulfillment | null
  linkedPlantingId: string | null
  plantedAt: string | null
  harvestedAt: string | null
  comment: string | null
}

export type RotationMatrixYear = {
  year: number
  cells: RotationMatrixCell[]
}

export type RotationMatrix = {
  fieldId: string
  fieldAreaHa: number | null
  years: RotationMatrixYear[]
}

export type RotationPlan = {
  id: string
  fieldId: string
  cropCode: string
  cropName: string | null
  varietyId: string | null
  varietyName: string | null
  areaHa: number
  seasonYear: number
  plannedPlantAt: string | null
  plannedHarvestAt: string | null
  comment: string | null
  status: string
  linkedPlantingId: string | null
  fulfillment: RotationFulfillment
  factAreaHa: number | null
  warning: string | null
}

export type RotationPlanWrite = {
  crop_code: string
  variety_id?: string | null
  area_ha: number
  season_year: number
  planned_plant_at?: string | null
  planned_harvest_at?: string | null
  comment?: string | null
  clear_variety?: boolean
  status?: string
}

export const FULFILLMENT_LABELS: Record<RotationFulfillment, string> = {
  pending: 'Ожидает',
  fulfilled: 'План выполнен',
  partial: 'Частично выполнен',
}

function mapCell(raw: Record<string, unknown>): RotationMatrixCell {
  return {
    kind: raw.kind === 'plan' ? 'plan' : 'fact',
    id: String(raw.id),
    cropCode: String(raw.crop_code ?? ''),
    cropName: raw.crop_name != null ? String(raw.crop_name) : null,
    varietyId: raw.variety_id != null ? String(raw.variety_id) : null,
    varietyName: raw.variety_name != null ? String(raw.variety_name) : null,
    areaHa: Number(raw.area_ha ?? 0),
    status: String(raw.status ?? ''),
    fulfillment:
      raw.fulfillment === 'fulfilled' || raw.fulfillment === 'partial' || raw.fulfillment === 'pending'
        ? raw.fulfillment
        : null,
    linkedPlantingId: raw.linked_planting_id != null ? String(raw.linked_planting_id) : null,
    plantedAt: raw.planted_at != null ? String(raw.planted_at) : null,
    harvestedAt: raw.harvested_at != null ? String(raw.harvested_at) : null,
    comment: raw.comment != null ? String(raw.comment) : null,
  }
}

export function mapRotationMatrix(raw: Record<string, unknown>): RotationMatrix {
  const yearsRaw = Array.isArray(raw.years) ? raw.years : []
  return {
    fieldId: String(raw.field_id),
    fieldAreaHa: raw.field_area_ha == null ? null : Number(raw.field_area_ha),
    years: yearsRaw.map((y) => {
      const row = y as Record<string, unknown>
      const cells = Array.isArray(row.cells) ? row.cells : []
      return {
        year: Number(row.year),
        cells: cells.map((c) => mapCell(c as Record<string, unknown>)),
      }
    }),
  }
}

export function mapRotationPlan(raw: Record<string, unknown>): RotationPlan {
  return {
    id: String(raw.id),
    fieldId: String(raw.field_id),
    cropCode: String(raw.crop_code ?? ''),
    cropName: raw.crop_name != null ? String(raw.crop_name) : null,
    varietyId: raw.variety_id != null ? String(raw.variety_id) : null,
    varietyName: raw.variety_name != null ? String(raw.variety_name) : null,
    areaHa: Number(raw.area_ha ?? 0),
    seasonYear: Number(raw.season_year),
    plannedPlantAt: raw.planned_plant_at != null ? String(raw.planned_plant_at) : null,
    plannedHarvestAt: raw.planned_harvest_at != null ? String(raw.planned_harvest_at) : null,
    comment: raw.comment != null ? String(raw.comment) : null,
    status: String(raw.status ?? 'active'),
    linkedPlantingId: raw.linked_planting_id != null ? String(raw.linked_planting_id) : null,
    fulfillment:
      raw.fulfillment === 'fulfilled' || raw.fulfillment === 'partial'
        ? raw.fulfillment
        : 'pending',
    factAreaHa: raw.fact_area_ha == null ? null : Number(raw.fact_area_ha),
    warning: raw.warning != null ? String(raw.warning) : null,
  }
}
