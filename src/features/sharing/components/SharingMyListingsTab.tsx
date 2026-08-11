import { Archive, Handshake, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMySharingListings } from '../hooks'
import type { SharingListing } from '../types'
import { isArchivedListing } from '../utils'
import { SharingListingModal } from './SharingListingModal'
import { SharingMyListingCard } from './SharingMyListingCard'

type SharingMyListingsTabProps = {
  onDetails: (listing: SharingListing) => void
}

export function SharingMyListingsTab({ onDetails }: SharingMyListingsTabProps) {
  const { data: listings = [], isLoading } = useMySharingListings()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SharingListing | null>(null)
  const [subTab, setSubTab] = useState<'active' | 'archive'>('active')

  const { activeListings, archivedListings } = useMemo(() => {
    const active: SharingListing[] = []
    const archived: SharingListing[] = []
    for (const listing of listings) {
      if (isArchivedListing(listing)) archived.push(listing)
      else active.push(listing)
    }
    return { activeListings: active, archivedListings: archived }
  }, [listings])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (listing: SharingListing) => {
    setEditing(listing)
    setModalOpen(true)
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          className="min-h-11 w-full justify-center bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10 sm:w-auto"
          onClick={openCreate}
        >
          <Plus className="size-4 shrink-0" />
          Разместить объявление
        </Button>
      </div>

      <Tabs
        value={subTab}
        onValueChange={(value) => setSubTab(value === 'archive' ? 'archive' : 'active')}
      >
        <TabsList className="grid h-auto min-h-11 w-full grid-cols-2 p-1 sm:w-fit">
          <TabsTrigger value="active" className="min-h-10">
            Активные ({activeListings.length})
          </TabsTrigger>
          <TabsTrigger value="archive" className="min-h-10">
            Архив объявлений ({archivedListings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {activeListings.length === 0 ? (
            <EmptyState
              icon={Handshake}
              title="У вас пока нет объявлений"
              description="Разместите первое объявление о поле, технике или приспособлении"
              action={{ label: 'Разместить объявление', onClick: openCreate }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
              {activeListings.map((listing) => (
                <SharingMyListingCard
                  key={listing.id}
                  listing={listing}
                  onEdit={openEdit}
                  onDetails={onDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          {archivedListings.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="Архив пуст"
              description="Удалённые объявления появятся здесь — их можно восстановить"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
              {archivedListings.map((listing) => (
                <SharingMyListingCard
                  key={listing.id}
                  listing={listing}
                  onEdit={openEdit}
                  onDetails={onDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SharingListingModal
        open={modalOpen}
        listing={editing}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
