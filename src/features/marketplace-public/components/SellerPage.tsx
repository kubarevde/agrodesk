import { Link } from '@tanstack/react-router'
import { BadgeCheck, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { usePublicSeller } from '../hooks'
import { averageRating } from '../lib'
import { ListingGrid } from './ListingGrid'
import { MarketShell } from './MarketShell'
import { ReviewList } from './ReviewList'

export function SellerPage({ sellerId }: { sellerId: string }) {
  const sellerQuery = usePublicSeller(sellerId)

  if (sellerQuery.isLoading) {
    return (
      <MarketShell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </MarketShell>
    )
  }

  if (sellerQuery.isError || !sellerQuery.data) {
    return (
      <MarketShell>
        <div className="space-y-3 py-8 text-center">
          <p className="font-medium text-foreground">Магазин не найден</p>
          <Link to="/market" className="text-sm text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </div>
      </MarketShell>
    )
  }

  const seller = sellerQuery.data
  const avg = averageRating(seller.reviews)

  return (
    <MarketShell title={seller.display_name}>
      <div className="mb-4">
        <Link to="/market" className="text-sm text-muted-foreground hover:text-primary">
          ← В каталог
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {seller.logo_url ? (
          <img
            src={seller.logo_url}
            alt=""
            className="size-20 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl font-semibold text-primary">
            {seller.display_name.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            {seller.display_name}
            {seller.is_verified ? (
              <BadgeCheck className="size-5 text-primary" aria-label="Проверен" />
            ) : null}
          </h1>
          {avg !== null ? (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-3.5 fill-primary text-primary" aria-hidden />
              <span className="tabular-nums text-foreground">{avg}</span>
              <span>· {seller.reviews.length} отзывов</span>
            </p>
          ) : null}
          {seller.description ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {seller.description}
            </p>
          ) : null}
          {seller.phone ? (
            <p className="mt-2 text-sm text-foreground">
              Тел.:{' '}
              <a href={`tel:${seller.phone}`} className="text-primary hover:underline">
                {seller.phone}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Товары магазина</h2>
        <ListingGrid
          items={seller.listings}
          isLoading={false}
          emptyTitle="Нет опубликованных товаров"
          emptyDescription="У этого продавца пока нет объявлений на витрине."
        />
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Отзывы</h2>
        <ReviewList reviews={seller.reviews} />
      </section>
    </MarketShell>
  )
}
