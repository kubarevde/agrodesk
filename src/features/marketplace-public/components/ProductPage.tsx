import { Link } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { BadgeCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { usePublicListing, usePublicSeller } from '../hooks'
import { formatMarketPriceAmount, isListingInStock, publicStockLabel } from '../lib'
import { ListingCard } from './ListingCard'
import { MarketShell } from './MarketShell'
import { OrderForm } from './OrderForm'
import { PhotoGallery } from './PhotoGallery'
import { ReviewList } from './ReviewList'

export function ProductPage({ listingId }: { listingId: string }) {
  const listingQuery = usePublicListing(listingId)
  const sellerId = listingQuery.data?.seller.id ?? ''
  const sellerQuery = usePublicSeller(sellerId)

  useEffect(() => {
    if (listingQuery.data?.title) {
      document.title = `${listingQuery.data.title} — витрина | АгроДеск`
    }
  }, [listingQuery.data?.title])

  const otherFromSeller = useMemo(() => {
    const rows = sellerQuery.data?.listings ?? []
    return rows.filter((row) => row.id !== listingId).slice(0, 4)
  }, [sellerQuery.data?.listings, listingId])

  if (listingQuery.isLoading) {
    return (
      <MarketShell>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4 max-w-md" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        </div>
      </MarketShell>
    )
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <MarketShell>
        <div className="space-y-3 py-10 text-center">
          <p className="font-medium text-foreground">Объявление не найдено</p>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Снято с витрины, ещё не опубликовано или ссылка устарела.
          </p>
          <Link to="/market" className="inline-flex text-sm font-medium text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </div>
      </MarketShell>
    )
  }

  const listing = listingQuery.data
  const inStock = isListingInStock(listing.quantity_available)
  const maxQty = Number(listing.quantity_available)
  const unit = (listing.unit || '').trim() || 'ед.'
  const reviews = sellerQuery.data?.reviews ?? []

  return (
    <MarketShell title={listing.title}>
      <Link to="/market" className="mb-4 inline-block text-sm text-muted-foreground hover:text-primary">
        ← В каталог
      </Link>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
        <PhotoGallery photos={listing.photos ?? []} title={listing.title} />

        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words text-foreground sm:text-3xl">
              {listing.title}
            </h1>
            <p className="truncate text-2xl font-semibold tabular-nums text-primary">
              {formatMarketPriceAmount(listing.price)}
            </p>
            <p className="text-sm text-muted-foreground">за {unit}</p>
            <p className="text-sm text-muted-foreground" data-testid="product-stock">
              {publicStockLabel(listing.quantity_available, unit)}
            </p>
          </div>

          <Link
            to="/market/seller/$id"
            params={{ id: listing.seller.id }}
            className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <span className="truncate">{listing.seller.display_name}</span>
            {listing.seller.is_verified ? (
              <BadgeCheck className="size-4 shrink-0" aria-label="Проверенный продавец" />
            ) : null}
          </Link>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {inStock
              ? 'Оставьте заявку — продавец свяжется напрямую. Оплата в системе не проходит.'
              : 'Товар сейчас недоступен для заявки. Можно посмотреть другие объявления продавца.'}
          </p>

          {inStock ? (
            <a
              href="#order"
              className={cn(
                buttonVariants(),
                'inline-flex h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:w-auto sm:min-w-52',
              )}
            >
              Оставить заявку
            </a>
          ) : null}

          {listing.description ? (
            <div>
              <h2 className="text-sm font-medium text-foreground">Описание</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed break-words text-muted-foreground">
                {listing.description}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Продавец не добавил описание.</p>
          )}

          {inStock ? (
            <OrderForm listingId={listing.id} maxQuantity={maxQty} unit={unit} />
          ) : (
            <div
              id="order"
              className="scroll-mt-20 rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground"
              data-testid="order-unavailable"
            >
              Сейчас нет в наличии — заявку отправить нельзя. Когда остаток появится снова, форма
              заявки станет доступна.
            </div>
          )}
          <section className="space-y-2 border-t border-border pt-5">
            <h2 className="text-sm font-medium text-foreground">Отзывы о продавце</h2>
            {sellerQuery.isLoading ? (
              <Skeleton className="h-20 w-full rounded-lg" />
            ) : (
              <ReviewList reviews={reviews} />
            )}
          </section>
        </div>
      </div>

      {otherFromSeller.length > 0 ? (
        <section className="mt-10 space-y-4 border-t border-border pt-8">
          <h2 className="text-base font-semibold text-foreground">
            Ещё от {listing.seller.display_name}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {otherFromSeller.map((row) => (
              <ListingCard key={row.id} listing={row} />
            ))}
          </div>
        </section>
      ) : null}
    </MarketShell>
  )
}
