import { DollarSign, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardStats } from '@/types'
import { cn } from '@/lib/utils'

interface FinanceCardsProps {
  stats: DashboardStats
}

function formatMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(Math.round(value)).toLocaleString('ru-RU')} ₽`
}

function formatMoneyPlain(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-semibold text-foreground', valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  )
}

export function FinanceCards({ stats }: FinanceCardsProps) {
  const profit = stats.monthShipmentsSum - stats.monthExpensesSum

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Финансы за месяц</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FinanceCard
          title="Выручка"
          value={formatMoneyPlain(stats.monthShipmentsSum)}
          icon={TrendingUp}
        />
        <FinanceCard
          title="Затраты"
          value={formatMoneyPlain(stats.monthExpensesSum)}
          icon={TrendingDown}
        />
        <FinanceCard
          title="Прибыль"
          value={formatMoney(profit)}
          icon={DollarSign}
          valueClassName={profit < 0 ? 'text-destructive' : 'text-success'}
        />
      </div>
    </section>
  )
}

export function FinanceCardsSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
