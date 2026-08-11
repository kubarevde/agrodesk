import { useMemo, useState } from 'react'
import { MapView, type MapMarker } from '@/components/shared/MapView'
import { Button } from '@/components/ui/button'
import {
  MapLocationSearch,
  type MapFlyTarget,
} from '@/features/fields/components/MapLocationSearch'

const DEFAULT_CENTER: [number, number] = [51.5, 36.5]

type EquipmentLocationPickerProps = {
  latitude?: number
  longitude?: number
  onChange: (latitude: number, longitude: number) => void
  onClear: () => void
  title?: string
  hint?: string
  markerLabel?: string
}

function toValidPoint(
  lat?: number,
  lng?: number,
): { lat: number; lng: number } | null {
  if (
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null
  }
  return { lat, lng }
}

/** Pick a point on the map; fills latitude/longitude in the form (MapView — no second engine). */
export function EquipmentLocationPicker({
  latitude,
  longitude,
  onChange,
  onClear,
  title = 'Местоположение на карте',
  hint = 'Найдите место или нажмите на карту — координаты подставятся автоматически. Можно править числа вручную ниже.',
  markerLabel = 'Местоположение',
}: EquipmentLocationPickerProps) {
  const [flyTo, setFlyTo] = useState<MapFlyTarget | null>(null)
  const point = toValidPoint(latitude, longitude)

  const markers = useMemo((): MapMarker[] => {
    if (!point) return []
    return [
      {
        id: 'equipment-point',
        lat: point.lat,
        lng: point.lng,
        label: markerLabel,
        color: 'blue',
      },
    ]
  }, [point, markerLabel])

  const center: [number, number] = point ? [point.lat, point.lng] : DEFAULT_CENTER

  const pick = (lat: number, lng: number) => {
    onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <MapLocationSearch
        onSelect={(target) => {
          setFlyTo(target)
          pick(target.lat, target.lng)
        }}
        hint=""
        placeholder="Населённый пункт, адрес или lat, lng"
      />

      <MapView
        height="220px"
        className="min-h-[200px]"
        center={center}
        zoom={point ? 14 : 11}
        markers={markers}
        defaultBasemap="hybrid"
        flyTo={flyTo}
        onMapClick={pick}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {point
            ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
            : 'Точка не выбрана'}
        </p>
        {point ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 w-full sm:min-h-8 sm:w-auto"
            onClick={onClear}
          >
            Сбросить точку
          </Button>
        ) : null}
      </div>
    </div>
  )
}
