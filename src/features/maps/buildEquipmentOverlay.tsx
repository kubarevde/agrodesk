import type { ReactNode } from 'react'
import type { MapMarker } from '@/components/shared/MapView'
import type { ImplementResponse } from '@/features/implements/types'
import { ToStatusBadge } from '@/features/equipment/components/ToStatusBadge'
import type { EquipmentDetail, ToStatus } from '@/features/equipment/types'
import type { AgroMapOverlay } from './types'

function statusColor(status: ToStatus): MapMarker['color'] {
  if (status === 'overdue') return 'red'
  if (status === 'warning') return 'yellow'
  if (status === 'ok') return 'green'
  return 'gray'
}

function defaultPopup(
  item: EquipmentDetail,
  attached: ImplementResponse[],
): ReactNode {
  return (
    <div className="min-w-40 space-y-2">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-xs text-muted-foreground">
        {item.current_meter} {item.meter_label}
      </p>
      <ToStatusBadge status={item.to_status} />
      {attached.length > 0 ? (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {attached.map((row) => (
            <li key={row.id}>{row.name}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Нет приспособлений</p>
      )}
    </div>
  )
}

export type BuildEquipmentOverlayOptions = {
  id?: string
  label?: string
  implementsByEquipment?: Record<string, ImplementResponse[]>
  buildPopup?: (item: EquipmentDetail, attached: ImplementResponse[]) => ReactNode
}

/** Build equipment markers for AgroMap. */
export function buildEquipmentOverlay(
  items: EquipmentDetail[],
  options: BuildEquipmentOverlayOptions = {},
): AgroMapOverlay {
  const {
    id = 'equipment',
    label = 'Техника',
    implementsByEquipment = {},
    buildPopup = defaultPopup,
  } = options

  const markers: MapMarker[] = items
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => {
      const attached = implementsByEquipment[item.id] ?? []
      return {
        id: item.id,
        lat: item.latitude as number,
        lng: item.longitude as number,
        label: item.name,
        color: statusColor(item.to_status),
        popupContent: buildPopup(item, attached),
      }
    })

  return { id, label, defaultVisible: true, markers }
}

export function equipmentPoints(
  items: EquipmentDetail[],
): Array<{ lat: number; lng: number }> {
  return items
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => ({
      lat: item.latitude as number,
      lng: item.longitude as number,
    }))
}
