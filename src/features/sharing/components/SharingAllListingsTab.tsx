import { Handshake, LayoutGrid, Map } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/features/auth/hooks'
import { useFields } from '@/features/fields/hooks'
import { useSharingListings } from '../hooks'
import type { PriceFilter, SharingListing, SharingListingType } from '../types'
import { matchesPriceFilter } from '../utils'
import { SharingFilters } from './SharingFilters'
import { SharingListingCard } from './SharingListingCard'
import { SharingListingsMap } from './SharingListingsMap'

type SharingAllListingsTabProps = {
  onDetails: (listing: SharingListing) => void
  onRequest: (listing: SharingListing) => void
}

export function SharingAllListingsTab({
  onDetails,
  onRequest,
}: SharingAllListingsTabProps) {
  const { data: user } = useCurrentUser()
  const [view, setView] = useState<'cards' | 'map'>('cards')
  const [type, setType] = useState<SharingListingType | undefined>()
  const [region, setRegion] = useState('')
  const [price, setPrice] = useState<PriceFilter>('all')

  const filters = useMemo(
    () => ({ type, region: region.trim() || undefined }),
    [region, type],
  )
  const { data: listings = [], isLoading } = useSharingListings(filters)
  const { data: fields = [] } = useFields()

  const fieldsById = useMemo(() => {
    const map: Record<string, (typeof fields)[number]> = {}
    for (const field of fields) map[field.id] = field
    return map
  }, [fields])

  const filtered = useMemo(
    () => listings.filter((item) => matchesPriceFilter(item, price)),
    [listings, price],
  )

  return (
    <div className="space-y-4">
      <SharingFilters
        type={type}
        region={region}
        price={price}
        onTypeChange={setType}
        onRegionChange={setRegion}
        onPriceChange={setPrice}
      />

      <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
        <TabsList>
          <TabsTrigger value="cards">
            <LayoutGrid className="size-3.5" />
            Карточки
          </TabsTrigger>
          <TabsTrigger value="map">
            <Map className="size-3.5" />
            Карта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {isLoading ? (
            <PageSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="Объявлений нет"
              description="Измените фильтры или дождитесь новых предложений"
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
              {filtered.map((listing) => (
                <SharingListingCard
                  key={listing.id}
                  listing={listing}
                  field={listing.fieldId ? fieldsById[listing.fieldId] : null}
                  isOwn={Boolean(user && listing.ownerId === user.id)}
                  onDetails={() => onDetails(listing)}
                  onRequest={() => onRequest(listing)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          {isLoading ? (
            <PageSkeleton />
          ) : (
            <SharingListingsMap listings={filtered} onDetails={onDetails} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
