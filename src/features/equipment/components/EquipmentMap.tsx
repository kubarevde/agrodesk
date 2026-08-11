import { useMemo } from 'react'
import { useFields, useSeasonPlantingOverlays } from '@/features/fields/hooks'
import type { ImplementResponse } from '@/features/implements/types'
import {
  AgroMap,
  buildEquipmentOverlay,
  buildFieldOverlay,
  fieldsContainingEquipment,
} from '@/features/maps'
import type { EquipmentDetail } from '../types'

type EquipmentMapProps = {
  items: EquipmentDetail[]
  implementsByEquipment: Record<string, ImplementResponse[]>
}

/**
 * Equipment map: markers for all units with coords + field contours
 * only when equipment lies inside a field (point-in-polygon).
 */
export function EquipmentMap({ items, implementsByEquipment }: EquipmentMapProps) {
  const { data: fields = [] } = useFields()
  const { data: plantings = [] } = useSeasonPlantingOverlays()

  const overlays = useMemo(() => {
    const containing = fieldsContainingEquipment(fields, items)
    const fieldIds = new Set(containing.map((f) => f.id))
    const relevantPlantings = plantings.filter((p) => fieldIds.has(p.fieldId))
    return [
      buildFieldOverlay(containing, {
        label: 'Поля с техникой',
        includeWeatherMarkers: false,
        plantings: relevantPlantings,
      }),
      buildEquipmentOverlay(items, { implementsByEquipment }),
    ]
  }, [fields, implementsByEquipment, items, plantings])

  return (
    <AgroMap
      overlays={overlays}
      showSearch
      height="min(70vh, 600px)"
      className="min-h-[280px]"
      defaultBasemap="satellite"
      zoom={11}
    />
  )
}
