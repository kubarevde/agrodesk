export type FieldResponse = {
  id: string
  name: string
  crop_type: string | null
  area_ha: number | null
  soil_type: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  polygon: number[][] | null
  sharing_status: string | null
  is_active: boolean
}

/** Map pin colors by crop display name (dictionary). Unknown crops → primary. */
export const CROP_COLORS: Record<string, string> = {
  Пшеница: '#F5C842',
  Подсолнечник: '#F5A623',
  Кукуруза: '#8BC34A',
  Озимые: '#4CAF50',
  Пар: '#9E9E9E',
  Ячмень: '#F5C842',
  Рапс: '#F5A623',
}

export function cropMapColor(cropType: string | null): string {
  if (!cropType) return '#01696F'
  return CROP_COLORS[cropType] ?? '#01696F'
}
