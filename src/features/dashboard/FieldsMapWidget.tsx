import { MapPinned } from 'lucide-react'
import { MapView, type MapMarker, type MapPolygon } from '@/components/shared/MapView'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useFields } from '@/features/fields/hooks'
import { cropMapColor } from '@/features/fields/types'

function markerColor(cropType: string | null): MapMarker['color'] {
  if (cropType === 'Пшеница' || cropType === 'Ячмень') return 'yellow'
  if (cropType === 'Подсолнечник' || cropType === 'Рапс') return 'yellow'
  if (cropType === 'Кукуруза' || cropType === 'Озимые') return 'green'
  if (cropType === 'Пар') return 'gray'
  return 'blue'
}

export function FieldsMapWidget() {
  const { data: fields = [], isLoading } = useFields()

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Поля хозяйства</h2>
        <PageSkeleton />
      </section>
    )
  }

  const markers: MapMarker[] = []
  const polygons: MapPolygon[] = []

  for (const field of fields) {
    if (!field.is_active) continue
    const color = cropMapColor(field.crop_type)
    const area = field.area_ha != null ? `${field.area_ha} га` : null
    const tooltip = [field.name, field.crop_type, area].filter(Boolean).join(' · ')

    if (field.polygon && field.polygon.length >= 3) {
      polygons.push({
        id: field.id,
        coordinates: field.polygon,
        color,
        fillColor: color,
        label: tooltip,
      })
      continue
    }

    if (field.latitude != null && field.longitude != null) {
      markers.push({
        id: field.id,
        lat: field.latitude,
        lng: field.longitude,
        label: field.name,
        sublabel: [field.crop_type, area].filter(Boolean).join(' · ') || undefined,
        color: markerColor(field.crop_type),
      })
    }
  }

  const center: [number, number] =
    markers[0] != null
      ? [markers[0].lat, markers[0].lng]
      : polygons[0]?.coordinates[0]
        ? [polygons[0].coordinates[0][0], polygons[0].coordinates[0][1]]
        : [51.5, 36.5]

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Карта полей</h2>
      {markers.length === 0 && polygons.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <MapPinned className="size-5 shrink-0" />
            Нет полей с координатами для отображения на карте
          </CardContent>
        </Card>
      ) : (
        <MapView height="280px" center={center} zoom={11} markers={markers} polygons={polygons} />
      )}
    </section>
  )
}
