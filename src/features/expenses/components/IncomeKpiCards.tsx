import { Skeleton } from '@/components/ui/skeleton'
import { formatIncomeMoney } from '../incomeUtils'

interface IncomeKpiCardsProps {
  totalAmount: number
  autoAmount: number
  manualAmount: number
  recordsCount: number
  isLoading: boolean
}

export function IncomeKpiCards({
  totalAmount,
  autoAmount,
  manualAmount,
  recordsCount,
  isLoading,
}: IncomeKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="income-kpi">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">Всего доходов за период</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatIncomeMoney(totalAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{recordsCount} записей</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">Из отгрузок</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatIncomeMoney(autoAmount)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted-foreground">Вручную</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {formatIncomeMoney(manualAmount)}
        </p>
      </div>
    </div>
  )
}
