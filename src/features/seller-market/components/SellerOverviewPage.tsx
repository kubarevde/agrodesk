import { Link } from '@tanstack/react-router'
import { Package, ShoppingBag, Store } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { useSellerListings, useSellerOrders, useSellerProfile } from '../hooks'
import { SellerMarketShell } from './SellerMarketShell'

export function SellerOverviewPage() {
  const profile = useSellerProfile()
  const listings = useSellerListings()
  const orders = useSellerOrders('new')

  if (profile.isLoading || listings.isLoading) {
    return (
      <SellerMarketShell>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      </SellerMarketShell>
    )
  }

  if (profile.isError || !profile.data) {
    return (
      <SellerMarketShell>
        <EmptyState
          icon={Store}
          title="Магазин недоступен"
          description="Витрина не включена для организации или нет права marketplace.manage."
        />
      </SellerMarketShell>
    )
  }

  const items = listings.data?.items ?? []
  const active = items.filter((i) =>
    ['draft', 'pending_review', 'published', 'rejected'].includes(i.status),
  ).length
  const published = items.filter((i) => i.status === 'published').length
  const newOrders = orders.data?.length ?? 0

  return (
    <SellerMarketShell>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Активные объявления</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{active}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">На витрине</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{published}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-muted-foreground">Новые заявки</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{newOrders}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
        {profile.data.logo_url ? (
          <img
            src={profile.data.logo_url}
            alt=""
            className="size-16 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="size-7" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{profile.data.display_name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {profile.data.phone || 'Телефон не указан'}
            {profile.data.is_verified ? ' · проверен' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/seller-market/profile"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Редактировать профиль
          </Link>
          <Link
            to="/seller-market/listings"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-primary text-primary-foreground')}
          >
            <Package className="mr-1.5 size-4" aria-hidden />
            Товары
          </Link>
          <Link
            to="/seller-market/orders"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <ShoppingBag className="mr-1.5 size-4" aria-hidden />
            Заказы
          </Link>
        </div>
      </div>
    </SellerMarketShell>
  )
}
