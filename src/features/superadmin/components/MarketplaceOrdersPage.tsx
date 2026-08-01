import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { ORDER_STATUS_LABELS } from '@/features/seller-market/labels'
import type { OrderStatus } from '@/features/seller-market/types'
import { useAdminOrders } from '../hooks/useMarketplace'
import { MarketplaceShell } from './MarketplaceShell'

export function MarketplaceOrdersPage() {
  const [status, setStatus] = useState('')
  const orders = useAdminOrders(status || undefined)

  return (
    <MarketplaceShell
      title="Заказы платформы"
      description="Все заявки для поддержки и разрешения споров продавца с покупателем."
    >
      <select
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        aria-label="Фильтр статуса заказа"
      >
        <option value="">Все статусы</option>
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((key) => (
          <option key={key} value={key}>
            {ORDER_STATUS_LABELS[key]}
          </option>
        ))}
      </select>

      {orders.isLoading ? (
        <PageSkeleton />
      ) : !orders.data?.length ? (
        <EmptyState
          icon={ShoppingBag}
          title="Заявок нет"
          description="Когда покупатели оформят заявки на витрине, они появятся здесь."
        />
      ) : (
        <ul className="space-y-3">
          {orders.data.map((o) => (
            <li key={o.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="font-medium text-foreground">{o.listingTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status} · {o.quantity} ·{' '}
                {o.sellerDisplayName} ({o.orgName})
              </p>
              <p className="mt-2 text-sm text-foreground">
                Покупатель: {o.buyerName} ·{' '}
                <a
                  href={`tel:${o.buyerPhone}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {o.buyerPhone}
                </a>
              </p>
              {o.buyerComment ? (
                <p className="mt-1 text-sm text-muted-foreground">{o.buyerComment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </MarketplaceShell>
  )
}
