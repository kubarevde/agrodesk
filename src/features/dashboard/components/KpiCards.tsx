import { AlertTriangle, Clock, Truck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
  tooltip?: string
}

function KpiCard({ title, value, icon: Icon, valueClassName, tooltip }: KpiCardProps) {
  const content = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-semibold text-foreground', valueClassName)}>{value}</p>
      </CardContent>
    </Card>
  )

  if (!tooltip) {
    return content
  }

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

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        title="Отгрузок за месяц"
        value={formatTonnes(stats.monthShipmentWeight)}
        icon={Truck}
      />
      <KpiCard
        title="ТМЦ требуют внимания"
        value={`${stats.criticalInventoryCount} позиций`}
        icon={AlertTriangle}
        valueClassName={stats.criticalInventoryCount > 0 ? 'text-destructive' : undefined}
      />
    </div>
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
