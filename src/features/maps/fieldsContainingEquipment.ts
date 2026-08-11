import type { FieldResponse } from '@/features/fields/types'
import type { EquipmentDetail } from '@/features/equipment/types'
import { filterRingsContainingAnyPoint } from '@/lib/maps/geo'
import { equipmentPoints } from './buildEquipmentOverlay'

/** Fields whose contour contains at least one equipment point. */
export function fieldsContainingEquipment(
  fields: FieldResponse[],
  equipment: EquipmentDetail[],
): FieldResponse[] {
  const points = equipmentPoints(equipment)
  return filterRingsContainingAnyPoint(fields, points, (field) => field.polygon)
}
