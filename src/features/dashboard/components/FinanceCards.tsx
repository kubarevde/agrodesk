import { DollarSign, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardStats } from '@/types'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

interface FinanceCardsProps {
  stats: DashboardStats
}

interface FinanceCardProps {
  title: string
  value: string
  icon: LucideIcon
  valueClassName?: string
}

function FinanceCard({ title, value, icon: Icon, valueClassName }: FinanceCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className={cn('text-xl font-semibold text-foreground', valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  )
}

export function FinanceCards({ stats }: FinanceCardsProps) {
  const profit = stats.monthShipmentsSum - stats.monthExpensesSum

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Финансы за месяц</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FinanceCard
          title="Выручка"
          value={formatMoney(stats.monthShipmentsSum)}
          icon={TrendingUp}
        />
        <FinanceCard
          title="Затраты"
          value={formatMoney(stats.monthExpensesSum)}
          icon={TrendingDown}
        />
        <FinanceCard
          title="Прибыль"
          value={formatMoney(profit, { signed: true })}
          icon={DollarSign}
          valueClassName={profit < 0 ? 'text-destructive' : 'text-success'}
        />
      </div>
    </section>
  )
}

export function FinanceCardsSkeleton() {
  return (
    <section className="space-y-2">
      <Skeleton className="h-4 w-36" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="px-4 pt-3 pb-1">
              <Skeleton className="h-3 w-16" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
