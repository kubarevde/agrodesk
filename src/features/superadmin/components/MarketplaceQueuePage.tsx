import { useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { formatMarketPrice, photoSrc } from '@/features/marketplace-public/lib'
import {
  useApproveListing,
  useModerationListings,
  useRejectListing,
} from '../hooks/useMarketplace'
import type { ModerationListing } from '../marketplaceTypes'
import { MarketplaceShell } from './MarketplaceShell'
import { RejectListingDialog } from './RejectListingDialog'

function ListingCard({
  item,
  onApprove,
  onReject,
  busy,
}: {
  item: ModerationListing
  onApprove: () => void
  onReject: () => void
  busy: boolean
}) {
  const img = photoSrc(item.photos)
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        {img ? (
          <img
            src={img}
            alt=""
            className="size-24 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            Нет фото
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground">{item.title}</p>
          <p className="text-sm text-muted-foreground">
            {item.sellerDisplayName} · {item.orgName}
          </p>
          <p className="text-sm text-foreground">
            {formatMarketPrice(item.price, item.unit)} · {item.quantityAvailable} {item.unit}
          </p>
          {item.description ? (
            <p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Без описания</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary-hover"
            disabled={busy}
            onClick={onApprove}
          >
            Одобрить
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onReject}>
            Отклонить
          </Button>
        </div>
      </div>
    </li>
  )
}

export function MarketplaceQueuePage() {
  const listings = useModerationListings('pending_review')
  const approve = useApproveListing()
  const reject = useRejectListing()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const busy = approve.isPending || reject.isPending

  return (
    <MarketplaceShell
      title="Очередь модерации"
      description="Объявления со статусом «на модерации». Одобрение публикует на витрине."
    >
      {listings.isLoading ? (
        <PageSkeleton />
      ) : !listings.data?.length ? (
        <EmptyState
          icon={PackageCheck}
          title="Очередь пуста"
          description="Нет объявлений, ожидающих проверки."
        />
      ) : (
        <ul className="space-y-3">
          {listings.data.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              busy={busy}
              onApprove={() => approve.mutate(item.id)}
              onReject={() => setRejectId(item.id)}
            />
          ))}
        </ul>
      )}

      <RejectListingDialog
        open={Boolean(rejectId)}
        onOpenChange={(open) => {
          if (!open) setRejectId(null)
        }}
        pending={reject.isPending}
        onConfirm={(reason) => {
          if (!rejectId) return
          reject.mutate(
            { id: rejectId, reason },
            { onSuccess: () => setRejectId(null) },
          )
        }}
      />
    </MarketplaceShell>
  )
}
