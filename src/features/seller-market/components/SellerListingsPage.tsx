import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { useArchiveSellerListing, useSellerListings } from '../hooks'
import type { ListingStatus } from '../types'
import { LISTING_STATUS_LABELS, listingRejectionVisible } from '../labels'
import { ListingStatusBadge, RejectionBanner } from './ListingStatusBadge'
import { SellerImportDialog } from './SellerImportDialog'
import { SellerMarketShell } from './SellerMarketShell'

export function SellerListingsPage() {
  const [status, setStatus] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)
  const listings = useSellerListings(status || undefined)
  const archive = useArchiveSellerListing()

  return (
    <SellerMarketShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Фильтр статуса"
        >
          <option value="">Все статусы</option>
          {(Object.keys(LISTING_STATUS_LABELS) as ListingStatus[]).map((key) => (
            <option key={key} value={key}>
              {LISTING_STATUS_LABELS[key]}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            onClick={() => setImportOpen(true)}
          >
            Импорт со склада / отгрузок
          </button>
          <Link
            to="/seller-market/listings/new"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-primary text-primary-foreground')}
          >
            <PackagePlus className="mr-1.5 size-4" aria-hidden />
            Создать вручную
          </Link>
        </div>
      </div>

      {listings.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !listings.data?.items.length ? (
        <div className="mt-4">
          <EmptyState
            icon={PackagePlus}
            title="Пока нет объявлений"
            description="Создайте вручную или импортируйте остаток со склада / отгрузку урожая."
          />
          <div className="mt-3 flex justify-center">
            <Link
              to="/seller-market/listings/new"
              className={cn(buttonVariants(), 'bg-primary text-primary-foreground')}
            >
              Создать объявление
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {listings.data.items.map((item) => {
            const rejection = listingRejectionVisible(item)
            return (
            <li
              key={item.id}
              className="rounded-lg border border-border bg-surface p-3 sm:p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.title}</p>
                    <ListingStatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.price} ₽ / {item.unit} · {item.quantity_available} {item.unit}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/seller-market/listings/$listingId"
                    params={{ listingId: item.id }}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Открыть
                  </Link>
                  {item.status !== 'archived' ? (
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                      disabled={archive.isPending}
                      onClick={() => archive.mutate(item.id)}
                    >
                      В архив
                    </button>
                  ) : null}
                </div>
              </div>
              {rejection ? (
                <div className="mt-3">
                  <RejectionBanner reason={rejection} />
                </div>
              ) : null}
            </li>
            )
          })}
        </ul>
      )}

      <SellerImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </SellerMarketShell>
  )
}
