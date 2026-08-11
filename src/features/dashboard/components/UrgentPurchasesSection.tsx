import { Link } from '@tanstack/react-router'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardUrgentPurchase } from '@/types'

type UrgentPurchasesSectionProps = {
  count: number
  items: DashboardUrgentPurchase[]
  isLoading: boolean
}

export function UrgentPurchasesSection({
  count,
  items,
  isLoading,
}: UrgentPurchasesSectionProps) {
  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3 pb-1.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShoppingCart className="size-3.5 text-primary" />
          Срочные закупки
          {count > 0 ? (
            <Badge variant="destructive" className="ml-1">
              {count}
            </Badge>
          ) : null}
        </CardTitle>
        <Link
          to="/purchase-planner"
          search={purchasePlannerSearch({ mode: 'checklist' })}
          className="text-xs text-primary hover:underline"
        >
          Открыть
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5 px-4 pb-3 text-sm">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Срочных покупок нет</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground">{item.title}</span>
                <span className="text-xs text-muted-foreground">
                  {item.linkedLabel ?? ''}
                  {item.estimatedCost != null
                    ? ` · ${item.estimatedCost.toLocaleString('ru-RU')} ₽`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
