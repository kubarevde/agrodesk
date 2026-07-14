import { CheckCircle2, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardCriticalItem } from '@/types'

interface CriticalInventorySectionProps {
  items: DashboardCriticalItem[]
  isLoading: boolean
}

function stockPercent(item: DashboardCriticalItem): number {
  if (item.minStock <= 0) return 0
  return Math.min(100, Math.max(0, (item.currentStock / item.minStock) * 100))
}

export function CriticalInventorySection({ items, isLoading }: CriticalInventorySectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Критичный склад</h2>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-success">
            <CheckCircle2 className="size-5 shrink-0" />
            Все запасы в норме
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const percent = stockPercent(item)
            return (
              <Card key={item.id} className="border-destructive/30 bg-destructive/5">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">{item.name}</CardTitle>
                  <Package className="size-4 text-destructive" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {item.currentStock.toLocaleString('ru-RU')} / мин.{' '}
                    {item.minStock.toLocaleString('ru-RU')} {item.unit}
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-destructive/15">
                    <div
                      className="h-full rounded-full bg-destructive transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
