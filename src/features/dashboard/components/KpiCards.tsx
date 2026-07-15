import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AlertTriangle, Clock, Truck, Users, Wallet, Wrench, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DashboardStats } from '@/types'
import { useLiveTodayHours } from '@/features/dashboard/useLiveTodayHours'
import { cn } from '@/lib/utils'

interface KpiCardsProps {
  stats: DashboardStats
}

function formatTonnes(kg: number): string {
  return `${(kg / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} т`
}

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  valueClassName?: string
  cardClassName?: string
  tooltip?: string
  footer?: ReactNode
}

function KpiCard({
  title,
  value,
  icon: Icon,
  valueClassName,
  cardClassName,
  tooltip,
  footer,
}: KpiCardProps) {
  const content = (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-semibold text-foreground', valueClassName)}>{value}</p>
        {footer}
      </CardContent>
    </Card>
  )

  if (!tooltip) return content

  return (
    <Tooltip>
      <TooltipTrigger className="block w-full cursor-default text-left">{content}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function KpiCards({ stats }: KpiCardsProps) {
  const liveTodayHours = useLiveTodayHours(stats.todayHours, stats.activeShifts)
  const activeNames = stats.activeShifts.map((shift) => shift.employeeName).join(', ')
  const critical = stats.criticalInventoryCount > 0
  const needsTo = stats.equipmentWarningCount > 0
  const monthLabel = format(new Date(), 'LLLL', { locale: ru })
  const noRate = stats.noRateShiftsCount > 0

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Сейчас на смене"
        value={`${stats.activeShiftsCount} чел.`}
        icon={Users}
        tooltip={activeNames || 'Нет активных смен'}
      />
      <KpiCard
        title="Отработано сегодня"
        value={`${liveTodayHours.toFixed(1)} ч`}
        icon={Clock}
      />
      <KpiCard
        title="Отгрузки за месяц"
        value={formatTonnes(stats.monthShipmentWeight)}
        icon={Truck}
      />
      <KpiCard
        title="ТМЦ требуют внимания"
        value={`${stats.criticalInventoryCount} позиций`}
        icon={AlertTriangle}
        cardClassName={critical ? 'border-destructive/40 bg-destructive/5' : undefined}
        valueClassName={critical ? 'text-destructive' : undefined}
      />
      <KpiCard
        title="Требует ТО"
        value={`${stats.equipmentWarningCount}`}
        icon={Wrench}
        cardClassName={
          needsTo
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-success/40 bg-success/5'
        }
        valueClassName={needsTo ? 'text-destructive' : 'text-success'}
      />
      <KpiCard
        title={`Фонд ЗП ${monthLabel}`}
        value={`${stats.monthSalaryTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`}
        icon={Wallet}
        cardClassName={noRate ? 'border-muted-foreground/30' : undefined}
        footer={
          <div className="mt-2 flex flex-col gap-1">
            {noRate ? (
              <span className="text-xs text-muted-foreground">
                {stats.noRateShiftsCount} без ставки
              </span>
            ) : null}
            <Link
              to="/employees"
              search={{ tab: 'salary' }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Подробнее
            </Link>
          </div>
        }
      />
    </div>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
