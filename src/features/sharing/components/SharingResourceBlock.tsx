import { MapView } from '@/components/shared/MapView'
import { ToStatusBadge } from '@/features/equipment/components/ToStatusBadge'
import { useEquipmentDetail } from '@/features/equipment/hooks'
import { useFieldDetail } from '@/features/fields/hooks'
import { useImplementDetail } from '@/features/implements/hooks'
import { getImplementCategoryConfig } from '@/features/implements/categoryConfig'
import { implementToStatus } from '@/features/implements/types'
import { humanLabel } from '@/lib/display'
import { SCOPE_LABELS, type SharingListing } from '../types'
import { resolveListingPolygon } from '../utils'

type SharingResourceBlockProps = {
  listing: SharingListing
}

export function SharingResourceBlock({ listing }: SharingResourceBlockProps) {
  const fieldId =
    listing.type === 'field' && listing.sharingScope !== 'partial_field'
      ? listing.fieldId ?? undefined
      : undefined
  const equipmentId =
    listing.type === 'equipment' ? listing.equipmentId ?? undefined : undefined
  const implementId =
    listing.type === 'implement' ? listing.implementId ?? undefined : undefined

  // Own-org full_field fallback only — never fetch source field for partial plots.
  const { data: field } = useFieldDetail(fieldId)
  const { data: equipment } = useEquipmentDetail(equipmentId)
  const { data: implement } = useImplementDetail(implementId)

  if (listing.type === 'field') {
    const poly = resolveListingPolygon(listing, field)
    const lat = listing.lat ?? field?.latitude ?? null
    const lng = listing.lng ?? field?.longitude ?? null
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
      poly && poly.length >= 3
        ? [
            {
              id: listing.id,
              coordinates: poly,
              label:
                listing.sharingScope === 'partial_field'
                  ? `Участок поля ${listing.fieldName ?? ''}`.trim()
                  : (listing.fieldName ?? listing.title),
              color: '#F7F6F2',
              fillColor: '#01696F',
              fillOpacity: 0.45,
              weight: 3,
            },
          ]
        : []

    const areaHa =
      listing.effectiveAreaHa ??
      (listing.sharingScope === 'full_field' ? field?.area_ha : null) ??
      null
    const area =
      areaHa != null ? `${Number(areaHa).toLocaleString('ru-RU')} га` : null

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {listing.sharingScope === 'partial_field'
            ? `Участок поля ${humanLabel(listing.fieldName, 'Поле')}`
            : humanLabel(listing.fieldName, 'Поле')}
          {area ? ` — ${area}` : ''}
          {` · ${SCOPE_LABELS[listing.sharingScope]}`}
        </p>
        {markers.length > 0 || polygons.length > 0 ? (
          <MapView
            height="180px"
            center={markers[0] ? [markers[0].lat, markers[0].lng] : [51.5, 36.5]}
            zoom={12}
            markers={polygons.length > 0 ? [] : markers}
            polygons={polygons}
            fitToData
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Контур поля не задан — на карте доступна только точка, если есть координаты.
          </p>
        )}
      </div>
    )
  }

  if (listing.type === 'equipment') {
    return (
      <div className="space-y-1 text-sm text-foreground">
        <p>Техника: {humanLabel(equipment?.name ?? listing.equipmentName ?? listing.title, 'Техника')}</p>
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
        <p>
          Приспособление:{' '}
          {humanLabel(implement?.name ?? listing.implementName ?? listing.title, 'Приспособление')}
        </p>
        {implement ? (
          <p className="flex flex-wrap items-center gap-2">
            Категория:
            <span>{getImplementCategoryConfig(implement.category).label}</span>
            <ToStatusBadge status={implementToStatus(implement)} />
          </p>
        ) : null}
      </div>
    )
  }

  return null
}
