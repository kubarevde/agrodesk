import { useState } from 'react'
import { MapView, type MapMarker, type MapPolygon } from '@/components/shared/MapView'
import { MapLocationSearch, type MapFlyTarget } from './MapLocationSearch'
import { cropMapColor } from '../types'
import type { FieldResponse } from '../types'

type FieldsMapProps = {
  fields: FieldResponse[]
}

export function FieldsMap({ fields }: FieldsMapProps) {
  const [flyTo, setFlyTo] = useState<MapFlyTarget | null>(null)
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
        color: '#F9F8F5',
        fillColor: color,
        label: `${field.name}${sublabel ? ` — ${sublabel}` : ''}`,
      })
      if (field.latitude != null && field.longitude != null) {
        markers.push({
          id: `${field.id}-weather`,
          lat: field.latitude,
          lng: field.longitude,
          label: `${field.name} · погода`,
          color: 'blue',
        })
      }
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

  const coloredMarkers: MapMarker[] = markers.map((marker) => {
    if (marker.id.endsWith('-weather')) return marker
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
    <div className="space-y-3">
      <MapLocationSearch
        className="max-w-xl"
        onSelect={setFlyTo}
        hint="Начните с поиска ближайшего населённого пункта — карта переместится туда"
      />
      <MapView
        height="min(70vh, 600px)"
        className="min-h-[280px]"
        center={center}
        zoom={12}
        markers={coloredMarkers}
        polygons={polygons}
        defaultBasemap="satellite"
        fitToData
        flyTo={flyTo}
      />
    </div>
  )
}
