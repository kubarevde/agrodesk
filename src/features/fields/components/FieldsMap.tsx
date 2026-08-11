import { useMemo } from 'react'
import { useEquipment } from '@/features/equipment/hooks'
import { useSeasonPlantingOverlays } from '@/features/fields/hooks'
import { useLocations } from '@/features/worktime/referenceHooks'
import {
  AgroMap,
  buildEquipmentOverlay,
  buildFieldOverlay,
  buildLocationsOverlay,
} from '@/features/maps'
import type { FieldResponse } from '../types'

type FieldsMapProps = {
  fields: FieldResponse[]
}

/** Enterprise fields map: field contours + plantings + equipment + work locations. */
export function FieldsMap({ fields }: FieldsMapProps) {
  const { data: equipment = [] } = useEquipment({ is_active: true })
  const { data: locations = [] } = useLocations()
  const { data: plantings = [] } = useSeasonPlantingOverlays()

  const overlays = useMemo(
    () => [
      buildFieldOverlay(fields, { plantings }),
      buildEquipmentOverlay(equipment),
      buildLocationsOverlay(locations),
    ],
    [equipment, fields, locations, plantings],
  )

  return (
    <AgroMap
      overlays={overlays}
      showSearch
      height="min(70vh, 600px)"
      className="min-h-[280px]"
      defaultBasemap="satellite"
      zoom={12}
    />
  )
}
