import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { useSellerOrders, useUpdateSellerOrder } from '../hooks'
import type { OrderStatus } from '../types'
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from '../labels'
import { SellerMarketShell } from './SellerMarketShell'

export function SellerOrdersPage() {
  const [status, setStatus] = useState<string>('')
  const orders = useSellerOrders(status || undefined)
  const update = useUpdateSellerOrder()

  return (
    <SellerMarketShell>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      {orders.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : !orders.data?.length ? (
        <div className="mt-4">
          <EmptyState
            icon={ShoppingBag}
            title="Заявок пока нет"
            description="Когда покупатель оставит заявку на витрине, она появится здесь."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.data.map((order) => {
            const next = ORDER_TRANSITIONS[order.status] ?? []
            return (
              <li
                key={order.id}
                className="rounded-lg border border-border bg-surface p-3 sm:p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{order.listing_title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {ORDER_STATUS_LABELS[order.status]} · {order.quantity} шт.
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      <span className="text-muted-foreground">Покупатель: </span>
                      {order.buyer_name}
                    </p>
                    <p className="mt-1 text-sm text-foreground" data-testid="buyer-phone">
                      <span className="text-muted-foreground">Телефон: </span>
                      <a
                        href={`tel:${order.buyer_phone}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {order.buyer_phone}
                      </a>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Связь вне системы — звонок или сообщение по этому номеру.
                      </span>
                    </p>
                    {order.buyer_comment ? (
                      <p className="mt-1 text-sm text-muted-foreground">{order.buyer_comment}</p>
                    ) : null}
                  </div>
                  {next.length ? (
                    <div className="flex flex-wrap gap-2">
                      {next.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={update.isPending}
                          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                          onClick={() => update.mutate({ id: order.id, status: s })}
                        >
                          {ORDER_STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SellerMarketShell>
  )
}
