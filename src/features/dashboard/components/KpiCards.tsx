import { AlertTriangle, Clock, Truck, Users, Wallet, Wrench, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DashboardStats } from '@/types'
import { useLiveTodayHours } from '@/features/dashboard/useLiveTodayHours'
import { useOrgTimezone } from '@/features/settings/useOrgTimezone'
import { formatInOrgTimezone } from '@/lib/timezone'
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <p className={cn('text-xl font-semibold text-foreground', valueClassName)}>{value}</p>
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
  const timezone = useOrgTimezone()
  const activeNames = stats.activeShifts.map((shift) => shift.employeeName).join(', ')
  const critical = stats.criticalInventoryCount > 0
  const needsTo = stats.equipmentWarningCount > 0
  const monthLabel = formatInOrgTimezone(new Date(), { month: 'long' }, timezone)
  const noRate = stats.noRateShiftsCount > 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="px-4 pt-3 pb-1">
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <Skeleton className="h-6 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
