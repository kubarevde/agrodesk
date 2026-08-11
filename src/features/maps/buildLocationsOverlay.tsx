import type { MapMarker } from '@/components/shared/MapView'
import type { Location } from '@/types'
import type { AgroMapOverlay } from './types'

export type BuildLocationsOverlayOptions = {
  id?: string
  label?: string
  /** Include system «Полевая работа» if it has coordinates. Default true. */
  includeSystem?: boolean
}

/** Build work-location markers for AgroMap (reuse MapView via AgroMap — no second engine). */
export function buildLocationsOverlay(
  locations: Location[],
  options: BuildLocationsOverlayOptions = {},
): AgroMapOverlay {
  const { id = 'locations', label = 'Места работы', includeSystem = true } = options

  const markers: MapMarker[] = locations
    .filter((item) => item.isActive !== false)
    .filter((item) => includeSystem || !item.isSystem)
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => ({
      id: item.id,
      lat: item.latitude as number,
      lng: item.longitude as number,
      label: item.name,
      color: item.isSystem ? 'blue' : 'green',
      popupContent: (
        <div className="min-w-36 space-y-1">
          <p className="font-medium text-foreground">{item.name}</p>
          {item.description ? (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          ) : null}
          {item.isSystem ? (
            <p className="text-xs text-muted-foreground">Системное место работы</p>
          ) : null}
        </div>
      ),
    }))

  return { id, label, defaultVisible: true, markers }
}
