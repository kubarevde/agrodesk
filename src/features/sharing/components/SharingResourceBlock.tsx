import { MapView } from '@/components/shared/MapView'
import { useEquipmentDetail } from '@/features/equipment/hooks'
import { useFieldDetail } from '@/features/fields/hooks'
import { useImplementDetail } from '@/features/implements/hooks'
import { conditionLabel } from '@/features/implements/types'
import type { SharingListing } from '../types'

type SharingResourceBlockProps = {
  listing: SharingListing
}

export function SharingResourceBlock({ listing }: SharingResourceBlockProps) {
  const fieldId = listing.type === 'field' ? listing.fieldId ?? undefined : undefined
  const equipmentId =
    listing.type === 'equipment' ? listing.equipmentId ?? undefined : undefined
  const implementId =
    listing.type === 'implement' ? listing.implementId ?? undefined : undefined

  const { data: field } = useFieldDetail(fieldId)
  const { data: equipment } = useEquipmentDetail(equipmentId)
  const { data: implement } = useImplementDetail(implementId)

  if (listing.type === 'field') {
    const lat = field?.latitude ?? listing.lat
    const lng = field?.longitude ?? listing.lng
    const markers =
      lat != null && lng != null
        ? [
            {
              id: listing.id,
              lat,
              lng,
              label: listing.fieldName ?? listing.title,
              color: 'green' as const,
            },
          ]
        : []
    const polygons =
      field?.polygon && field.polygon.length > 0
        ? [
            {
              id: listing.id,
              coordinates: field.polygon,
              label: field.name,
              color: 'var(--success)',
            },
          ]
        : []

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {listing.fieldName}
          {field?.area_ha != null ? ` — ${field.area_ha} га` : ''}
          {field?.crop_type ? `, ${field.crop_type}` : ''}
        </p>
        {markers.length > 0 || polygons.length > 0 ? (
          <MapView
            height="200px"
            center={markers[0] ? [markers[0].lat, markers[0].lng] : [51.5, 36.5]}
            zoom={12}
            markers={markers}
            polygons={polygons}
          />
        ) : null}
      </div>
    )
  }

  if (listing.type === 'equipment') {
    return (
      <div className="space-y-1 text-sm text-foreground">
        <p>Техника: {equipment?.name ?? listing.equipmentName ?? listing.title}</p>
        {equipment?.type ? <p>Тип: {equipment.type}</p> : null}
        {equipment?.year_of_manufacture ? <p>Год: {equipment.year_of_manufacture}</p> : null}
        {equipment ? (
          <p>
            Счётчик: {equipment.current_meter} {equipment.meter_label}
          </p>
        ) : null}
      </div>
    )
  }

  if (listing.type === 'implement') {
    return (
      <div className="space-y-1 text-sm text-foreground">
        <p>Приспособление: {implement?.name ?? listing.implementName ?? listing.title}</p>
        {implement ? (
          <>
            <p>Категория: {implement.category}</p>
            <p>Состояние: {conditionLabel(implement.condition)}</p>
            <p>Обычно крепится к: {implement.current_equipment_name ?? 'не закреплено'}</p>
          </>
        ) : null}
      </div>
    )
  }

  return null
}
