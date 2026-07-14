import { Button } from '@/components/ui/button'
import { MapView, type MapMarker } from '@/components/shared/MapView'
import type { SharingListing } from '../types'
import { formatListingPrice, mapMarkerColor, typeBadgeLabel } from '../utils'

type SharingListingsMapProps = {
  listings: SharingListing[]
  onDetails: (listing: SharingListing) => void
}

export function SharingListingsMap({ listings, onDetails }: SharingListingsMapProps) {
  const withCoords = listings.filter(
    (item) => item.lat != null && item.lng != null,
  )

  const markers: MapMarker[] = withCoords.map((listing) => ({
    id: listing.id,
    lat: listing.lat as number,
    lng: listing.lng as number,
    label: listing.title,
    color: mapMarkerColor(listing.type),
    popupContent: (
      <div className="min-w-40 space-y-1.5">
        <p className="font-medium text-foreground">{listing.title}</p>
        <p className="text-xs text-muted-foreground">{typeBadgeLabel(listing.type)}</p>
        <p className="text-sm text-foreground">{formatListingPrice(listing)}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => onDetails(listing)}>
          Подробнее
        </Button>
      </div>
    ),
  }))

  const center: [number, number] =
    markers.length > 0 ? [markers[0].lat, markers[0].lng] : [51.5, 36.5]

  return <MapView height="550px" center={center} zoom={10} markers={markers} />
}
