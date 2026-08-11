import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { MapView, type MapMarker, type MapPolygon } from '@/components/shared/MapView'
import type { FieldResponse } from '@/features/fields/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { SharingListing } from '../types'
import { formatListingPrice, mapMarkerColor, resolveListingPolygon, typeBadgeLabel } from '../utils'

/** High-contrast field contour — readable on green satellite / schema tiles. */
const FIELD_POLYGON_STROKE = '#F7F6F2'
const FIELD_POLYGON_FILL = '#01696F'

type SharingListingsMapProps = {
  listings: SharingListing[]
  fieldsById?: Record<string, FieldResponse>
  onDetails: (listing: SharingListing) => void
}

function listingPopup(
  listing: SharingListing,
  onDetails: (listing: SharingListing) => void,
) {
  return (
    <div className="min-w-44 max-w-56 space-y-2 p-0.5">
      <p className="font-medium leading-snug text-foreground">{listing.title}</p>
      <p className="text-xs text-muted-foreground">{typeBadgeLabel(listing.type)}</p>
      <p className="text-sm text-foreground">{formatListingPrice(listing)}</p>
      <Button
        type="button"
        size="sm"
        className="min-h-10 w-full"
        onClick={() => onDetails(listing)}
      >
        Подробнее
      </Button>
    </div>
  )
}

/**
 * Browse map for active listings (MapView from maps 5.3):
 * - field with known contour → polygon (+ popup)
 * - field without contour / equipment / implement → point (+ popup)
 * Detail sheet opens only via «Подробнее» in the popup (avoids sheet-under-map clicks).
 */
export function SharingListingsMap({
  listings,
  fieldsById = {},
  onDetails,
}: SharingListingsMapProps) {
  const isMobile = useIsMobile(639)
  const { markers, polygons } = useMemo(() => {
    const nextMarkers: MapMarker[] = []
    const nextPolygons: MapPolygon[] = []

    for (const listing of listings) {
      if (listing.type === 'field') {
        const field = listing.fieldId ? fieldsById[listing.fieldId] : null
        const poly = resolveListingPolygon(listing, field)
        if (poly && poly.length >= 3) {
          nextPolygons.push({
            id: listing.id,
            coordinates: poly,
            color: FIELD_POLYGON_STROKE,
            fillColor: FIELD_POLYGON_FILL,
            fillOpacity: 0.45,
            weight: 3,
            label: listing.title,
            popupContent: listingPopup(listing, onDetails),
          })
          continue
        }
      }

      const lat = listing.lat ?? (listing.fieldId ? fieldsById[listing.fieldId]?.latitude : null)
      const lng = listing.lng ?? (listing.fieldId ? fieldsById[listing.fieldId]?.longitude : null)
      if (lat == null || lng == null) continue

      nextMarkers.push({
        id: listing.id,
        lat,
        lng,
        label: listing.title,
        color: mapMarkerColor(listing.type),
        popupContent: listingPopup(listing, onDetails),
      })
    }

    return { markers: nextMarkers, polygons: nextPolygons }
  }, [fieldsById, listings, onDetails])

  const center: [number, number] =
    markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : polygons[0]?.coordinates[0]
        ? [polygons[0].coordinates[0][0], polygons[0].coordinates[0][1]]
        : [51.5, 36.5]

  if (markers.length === 0 && polygons.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        Нет объявлений с координатами для отображения на карте
      </p>
    )
  }

  return (
    <MapView
      height={isMobile ? '360px' : '550px'}
      center={center}
      zoom={10}
      markers={markers}
      polygons={polygons}
      fitToData
    />
  )
}
