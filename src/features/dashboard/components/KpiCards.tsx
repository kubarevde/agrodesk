import { AlertTriangle, Clock, Truck, Users, Wallet, Wrench, type LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { DashboardStats } from '@/types'
import { useLiveTodayHours } from '@/features/dashboard/useLiveTodayHours'
import { useOrgTimezone } from '@/features/settings/useOrgTimezone'
import { formatMoney } from '@/lib/format'
import { formatInOrgTimezone } from '@/lib/timezone'
import { cn } from '@/lib/utils'

interface KpiCardsProps {
  stats: DashboardStats
}

function formatTonnes(kg: number): string {
  return `${(kg / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} т`
}

type KpiLink =
  | { to: '/worktime'; search?: { status?: 'open' | 'closed' } }
  | { to: '/shipments' }
  | { to: '/inventory' }
  | { to: '/equipment' }
  | { to: '/employees'; search: { tab: 'salary' } }

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  href: KpiLink
  valueClassName?: string
  cardClassName?: string
  tooltip?: string
}

function KpiCard({
  title,
  value,
  icon: Icon,
  href,
  valueClassName,
  cardClassName,
  tooltip,
}: KpiCardProps) {
  const card = (
    <Card
      className={cn(
        'h-full transition-colors hover:bg-muted/40 hover:ring-1 hover:ring-foreground/10',
        cardClassName,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-3 pt-2.5 pb-0.5">
        <CardTitle className="min-h-8 line-clamp-2 text-xs font-medium leading-4 text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-3 pb-2.5">
        <p className={cn('text-lg font-semibold text-foreground', valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  )

  const link = (
    <Link
      {...href}
      className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${title}: ${value}`}
    >
      {card}
    </Link>
  )

  if (!tooltip) return link

  return (
    <Tooltip>
      <TooltipTrigger className="block h-full w-full text-left">{link}</TooltipTrigger>
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

  return (
    <div className="grid grid-cols-2 items-stretch gap-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Сейчас на смене"
        value={`${stats.activeShiftsCount} чел.`}
        icon={Users}
        href={{ to: '/worktime', search: { status: 'open' } }}
        tooltip={activeNames || 'Нет активных смен'}
      />
      <KpiCard
        title="Отработано сегодня"
        value={`${liveTodayHours.toFixed(1)} ч`}
        icon={Clock}
        href={{ to: '/worktime' }}
      />
      <KpiCard
        title="Отгрузки урожая за месяц"
        value={formatTonnes(stats.monthShipmentWeight)}
        icon={Truck}
        href={{ to: '/shipments' }}
      />
      <KpiCard
        title="Склад требует внимания"
        value={`${stats.criticalInventoryCount} позиций`}
        icon={AlertTriangle}
        href={{ to: '/inventory' }}
        cardClassName={critical ? 'border-destructive/40 bg-destructive/5' : undefined}
        valueClassName={critical ? 'text-destructive' : undefined}
      />
      <KpiCard
        title="Требует обслуживания"
        value={`${stats.equipmentWarningCount}`}
        icon={Wrench}
        href={{ to: '/equipment' }}
        cardClassName={
          needsTo
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-success/40 bg-success/5'
        }
        valueClassName={needsTo ? 'text-destructive' : 'text-success'}
      />
      <KpiCard
        title={`Фонд зарплаты · ${monthLabel}`}
        value={formatMoney(stats.monthSalaryTotal, { decimals: 2 })}
        icon={Wallet}
        href={{ to: '/employees', search: { tab: 'salary' } }}
      />
    </div>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 items-stretch gap-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="h-full">
          <CardHeader className="px-3 pt-2.5 pb-0.5">
            <Skeleton className="h-8 w-20" />
          </CardHeader>
          <CardContent className="px-3 pb-2.5">
            <Skeleton className="h-5 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
