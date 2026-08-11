import type { FieldResponse } from './types'
import { filterByListSearch } from '@/lib/listSearch'

export function filterFieldsBySearch(fields: FieldResponse[], search: string): FieldResponse[] {
  return filterByListSearch(fields, search, (field) => [
    field.name,
    field.crop_type,
    field.crop_code,
    field.soil_type,
    field.description,
    field.area_ha,
  ])
}
