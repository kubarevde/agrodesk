export type SeasonPlantingOverlay = {
  id: string
  fieldId: string
  fieldName: string
  cropCode: string
  cropName: string | null
  varietyId: string | null
  varietyName: string | null
  areaHa: number
  mapColor: string | null
  polygon: number[][] | null
  seasonYear: number
  status: string
}

export function mapSeasonPlantingOverlay(raw: Record<string, unknown>): SeasonPlantingOverlay {
  return {
    id: String(raw.id),
    fieldId: String(raw.field_id),
    fieldName: String(raw.field_name ?? ''),
    cropCode: String(raw.crop_code ?? ''),
    cropName: raw.crop_name != null ? String(raw.crop_name) : null,
    varietyId: raw.variety_id != null ? String(raw.variety_id) : null,
    varietyName: raw.variety_name != null ? String(raw.variety_name) : null,
    areaHa: Number(raw.area_ha ?? 0),
    mapColor: raw.map_color != null ? String(raw.map_color) : null,
    polygon: Array.isArray(raw.polygon) ? (raw.polygon as number[][]) : null,
    seasonYear: Number(raw.season_year),
    status: String(raw.status ?? ''),
  }
}
