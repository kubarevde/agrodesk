import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SharingListing } from '../types'
import { SharingAllListingsTab } from './SharingAllListingsTab'
import { SharingDetailSheet } from './SharingDetailSheet'
import { SharingMyListingsTab } from './SharingMyListingsTab'
import { SharingMyRequestsTab } from './SharingMyRequestsTab'
import { SharingRequestModal } from './SharingRequestModal'

export function SharingPage() {
  const [mainTab, setMainTab] = useState<'all' | 'my' | 'requests'>('all')
  const [selected, setSelected] = useState<SharingListing | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [requestListing, setRequestListing] = useState<SharingListing | null>(null)

  const openDetails = (listing: SharingListing) => {
    setSelected(listing)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Шеринг</h1>

      <Tabs
        value={mainTab}
        onValueChange={(value) => setMainTab(value as typeof mainTab)}
      >
        <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
          <TabsTrigger value="all">Все объявления</TabsTrigger>
          <TabsTrigger value="my">Мои объявления</TabsTrigger>
          <TabsTrigger value="requests">Мои заявки</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <SharingAllListingsTab onDetails={openDetails} onRequest={setRequestListing} />
        </TabsContent>

        <TabsContent value="my" className="mt-4">
          <SharingMyListingsTab onDetails={openDetails} />
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          <SharingMyRequestsTab />
        </TabsContent>
      </Tabs>

      <SharingDetailSheet
        listing={selected}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {requestListing ? (
        <SharingRequestModal
          open={Boolean(requestListing)}
          listingId={requestListing.id}
          listingTitle={requestListing.title}
          onClose={() => setRequestListing(null)}
        />
      ) : null}
    </div>
  )
}
