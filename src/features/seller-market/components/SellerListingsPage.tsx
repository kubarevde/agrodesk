import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { useArchiveSellerListing, useSellerListings } from '../hooks'
import type { ListingStatus } from '../types'
import { LISTING_STATUS_LABELS } from '../labels'
import { SellerImportDialog } from './SellerImportDialog'
import { SellerListingRow } from './SellerListingRow'
import { SellerMarketShell } from './SellerMarketShell'

export function SellerListingsPage() {
  const [status, setStatus] = useState<string>('')
  const [importOpen, setImportOpen] = useState(false)
  const listings = useSellerListings(status || undefined)
  const archive = useArchiveSellerListing()
  const filterActive = Boolean(status)

  const emptyTitle = filterActive ? 'Нет объявлений с этим статусом' : 'Пока нет объявлений'
  const emptyDescription = filterActive
    ? 'Смените фильтр или создайте новое объявление.'
    : 'Создайте вручную или импортируйте позицию склада / отгрузку (количество будет синхронизироваться с источником).'

  return (
    <SellerMarketShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Объявления</h1>
          <p className="text-sm text-muted-foreground">
            Черновик → модерация → витрина. Опубликовать самому нельзя.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-10')}
            onClick={() => setImportOpen(true)}
          >
            Импорт со склада
          </button>
          <Link
            to="/seller-market/listings/new"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'min-h-10 bg-primary text-primary-foreground',
            )}
          >
            <PackagePlus className="mr-1.5 size-4" aria-hidden />
            Создать
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <label className="sr-only" htmlFor="seller-listing-status">
          Фильтр статуса
        </label>
        <select
          id="seller-listing-status"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm sm:w-56"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Все статусы</option>
          {(Object.keys(LISTING_STATUS_LABELS) as ListingStatus[]).map((key) => (
            <option key={key} value={key}>
              {LISTING_STATUS_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {listings.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : !listings.data?.items.length ? (
        <div className="mt-4">
          <EmptyState icon={PackagePlus} title={emptyTitle} description={emptyDescription} />
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {filterActive ? (
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline' }))}
                onClick={() => setStatus('')}
              >
                Сбросить фильтр
              </button>
            ) : null}
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
          {listings.data.items.map((item) => (
            <SellerListingRow
              key={item.id}
              item={item}
              archivePending={archive.isPending}
              onArchive={(id) => archive.mutate(id)}
            />
          ))}
        </ul>
      )}

      <SellerImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </SellerMarketShell>
  )
}
