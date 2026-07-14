import { MapView, type MapMarker, type MapPolygon } from '@/components/shared/MapView'
import { cropMapColor } from '../types'
import type { FieldResponse } from '../types'

type FieldsMapProps = {
  fields: FieldResponse[]
}

export function FieldsMap({ fields }: FieldsMapProps) {
  const markers: MapMarker[] = []
  const polygons: MapPolygon[] = []

  for (const field of fields) {
    const color = cropMapColor(field.crop_type)
    const sharing = field.sharing_status === 'active' ? ' · В шеринге' : ''
    const area = field.area_ha != null ? `${field.area_ha} га` : undefined
    const sublabel = [area, field.crop_type, sharing.trim() || null]
      .filter(Boolean)
      .join(' · ')

    if (field.polygon && field.polygon.length >= 3) {
      polygons.push({
        id: field.id,
        coordinates: field.polygon,
        color,
        fillColor: color,
        label: `${field.name}${sublabel ? ` — ${sublabel}` : ''}`,
      })
      continue
    }

    if (field.latitude != null && field.longitude != null) {
      markers.push({
        id: field.id,
        lat: field.latitude,
        lng: field.longitude,
        label: field.name,
        sublabel: sublabel || undefined,
        color: 'blue',
      })
    }
  }

  // Prefer crop-colored div icons via polygon path color; for markers use green/yellow map colors roughly.
  const coloredMarkers: MapMarker[] = markers.map((marker) => {
    const field = fields.find((item) => item.id === marker.id)
    const crop = field?.crop_type
    let color: MapMarker['color'] = 'blue'
    if (crop === 'Пшеница' || crop === 'Ячмень') color = 'yellow'
    else if (crop === 'Подсолнечник' || crop === 'Рапс') color = 'yellow'
    else if (crop === 'Кукуруза' || crop === 'Озимые') color = 'green'
    else if (crop === 'Пар') color = 'gray'
    return { ...marker, color }
  })

  const center: [number, number] =
    coloredMarkers[0] != null
      ? [coloredMarkers[0].lat, coloredMarkers[0].lng]
      : polygons[0]?.coordinates[0]
        ? [polygons[0].coordinates[0][0], polygons[0].coordinates[0][1]]
        : [51.5, 36.5]

  return (
    <MapView height="600px" center={center} zoom={11} markers={coloredMarkers} polygons={polygons} />
  )
}
