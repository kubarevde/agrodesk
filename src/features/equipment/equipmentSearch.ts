import type { EquipmentDetail } from './types'
import { filterByListSearch } from '@/lib/listSearch'

export function filterEquipmentBySearch(
  items: EquipmentDetail[],
  search: string,
  implementsByEquipment: Record<string, Array<{ name: string }>> = {},
): EquipmentDetail[] {
  return filterByListSearch(items, search, (item) => {
    const attached = (implementsByEquipment[item.id] ?? []).map((row) => row.name)
    return [
      item.name,
      item.type,
      item.serial_number,
      item.year_of_manufacture,
      item.meter_label,
      ...attached,
    ]
  })
}
