import { MapView, type MapMarker } from '@/components/shared/MapView'
import type { ImplementResponse } from '@/features/implements/types'
import type { EquipmentDetail, ToStatus } from '../types'
import { ToStatusBadge } from './ToStatusBadge'

type EquipmentMapProps = {
  items: EquipmentDetail[]
  implementsByEquipment: Record<string, ImplementResponse[]>
}

function statusColor(status: ToStatus): MapMarker['color'] {
  if (status === 'overdue') return 'red'
  if (status === 'warning') return 'yellow'
  if (status === 'ok') return 'green'
  return 'gray'
}

export function EquipmentMap({ items, implementsByEquipment }: EquipmentMapProps) {
  const withCoords = items.filter(
    (item) => item.latitude != null && item.longitude != null,
  )

  const markers: MapMarker[] = withCoords.map((item) => {
    const attached = implementsByEquipment[item.id] ?? []
    return {
      id: item.id,
      lat: item.latitude as number,
      lng: item.longitude as number,
      label: item.name,
      color: statusColor(item.to_status),
      popupContent: (
        <div className="space-y-2 min-w-40">
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
      ),
    }
  })

  const center: [number, number] =
    markers[0] != null ? [markers[0].lat, markers[0].lng] : [51.5, 36.5]

  return <MapView height="600px" center={center} zoom={11} markers={markers} />
}
