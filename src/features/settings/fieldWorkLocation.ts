import type { Location } from '@/types'

/** Stable code of the protected system work location (backend `field_work`). */
export const FIELD_WORK_LOCATION_CODE = 'field_work'

export function findFieldWorkLocation(locations: Location[]): Location | undefined {
  return (
    locations.find((item) => item.code === FIELD_WORK_LOCATION_CODE) ??
    locations.find((item) => item.isSystem && item.name === 'Полевая работа')
  )
}

/** «Поле» is required only when the chosen work location is system «Полевая работа». */
export function isFieldRequiredForLocation(
  locationId: string | undefined | null,
  fieldWorkLocationId: string | undefined | null,
): boolean {
  return Boolean(locationId && fieldWorkLocationId && locationId === fieldWorkLocationId)
}
