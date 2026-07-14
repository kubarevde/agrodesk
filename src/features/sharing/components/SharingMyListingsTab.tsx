import { Handshake, Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useMySharingListings } from '../hooks'
import type { SharingListing } from '../types'
import { SharingListingModal } from './SharingListingModal'
import { SharingMyListingCard } from './SharingMyListingCard'

type SharingMyListingsTabProps = {
  onDetails: (listing: SharingListing) => void
}

export function SharingMyListingsTab({ onDetails }: SharingMyListingsTabProps) {
  const { data: listings = [], isLoading } = useMySharingListings()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SharingListing | null>(null)

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
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Разместить объявление
        </Button>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="У вас пока нет объявлений"
          description="Разместите первое объявление о поле, технике или приспособлении"
          action={{ label: 'Разместить объявление', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {listings.map((listing) => (
            <SharingMyListingCard
              key={listing.id}
              listing={listing}
              onEdit={openEdit}
              onDetails={onDetails}
            />
          ))}
        </div>
      )}

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
