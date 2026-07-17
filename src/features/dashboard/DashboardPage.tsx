import { RefreshCw } from 'lucide-react'
import { OnlineOnlyNotice } from '@/components/shared/OnlineOnlyNotice'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { SystemStatus } from '@/components/shared/SystemStatus'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { ForecastDashboardWidget } from '@/features/analytics/components/ForecastDashboardWidget'
import { ActiveRepairsWidget } from '@/features/repair-journal/components/ActiveRepairsWidget'
import { dashboardHelp } from '@/features/help/content'
import { useOrgTimezone } from '@/features/settings/useOrgTimezone'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { formatInOrgTimezone } from '@/lib/timezone'
import { FieldsMapWidget } from './FieldsMapWidget'
import { ActiveShiftsSection } from './components/ActiveShiftsSection'
import { AgroPlanTodaySection } from './components/AgroPlanTodaySection'
import { CriticalInventorySection } from './components/CriticalInventorySection'
import { EquipmentWarningsSection } from './components/EquipmentWarningsSection'
import { FinanceCards, FinanceCardsSkeleton } from './components/FinanceCards'
import { KpiCards, KpiCardsSkeleton } from './components/KpiCards'
import { SharingDashboardSection } from './components/SharingDashboardSection'
import { UrgentPurchasesSection } from './components/UrgentPurchasesSection'
import { WeeklyHoursChart, WeeklyHoursChartSkeleton } from './components/WeeklyHoursChart'
import { useDashboardStats } from './hooks'

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const canForecast = user?.role === 'admin' || user?.role === 'manager'
  const isOnline = useOnlineStatus()
  const timezone = useOrgTimezone()
  const { data: stats, isLoading, isFetching, dataUpdatedAt, refetch, isError } =
    useDashboardStats()
  const updatedLabel = dataUpdatedAt
    ? formatInOrgTimezone(
        new Date(dataUpdatedAt),
        { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false },
        timezone,
      )
    : '—'

  if (!isOnline && (!stats || isError)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Дашборд доступен только онлайн"
          description="KPI и финансы считаются на сервере. Без сети откройте «Рабочее время» — смены можно вести офлайн; данные подтянутся после подключения."
        />
        <SectionHelp title="Справка по дашборду" items={dashboardHelp} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <p className="text-xs text-muted-foreground">Обновлено в {updatedLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Обновить дашборд"
            disabled={isFetching || !isOnline}
            onClick={() => void refetch()}
          >
            <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
          </Button>
        </div>
      </div>

      {!isOnline ? (
        <OnlineOnlyNotice
          hideWhenOnline={false}
          title="Показаны последние загруженные данные"
          description="Нет сети — цифры могут быть устаревшими. Смены по-прежнему можно вести офлайн."
        />
      ) : null}

      {isLoading || !stats ? <KpiCardsSkeleton /> : <KpiCards stats={stats} />}

      <div className="grid gap-3 lg:grid-cols-2">
        <EquipmentWarningsSection
          items={stats?.equipmentWarnings ?? []}
          isLoading={isLoading}
        />
        <AgroPlanTodaySection items={stats?.agroPlanToday ?? []} isLoading={isLoading} />
      </div>

      {isLoading || !stats ? <FinanceCardsSkeleton /> : <FinanceCards stats={stats} />}

      {canForecast ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <ForecastDashboardWidget />
          <ActiveRepairsWidget />
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {isLoading || !stats ? (
          <WeeklyHoursChartSkeleton />
        ) : (
          <WeeklyHoursChart data={stats.weeklyHours} />
        )}
        <ActiveShiftsSection shifts={stats?.activeShifts ?? []} isLoading={isLoading} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <CriticalInventorySection
          items={stats?.criticalInventory ?? []}
          isLoading={isLoading}
        />
        <UrgentPurchasesSection
          count={stats?.urgentPurchasesCount ?? 0}
          items={stats?.urgentPurchases ?? []}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SharingDashboardSection
          newRequests={stats?.sharingNewRequests ?? 0}
          isLoadingStats={isLoading}
        />
      </div>

      {isAdmin ? <SystemStatus /> : null}

      <SectionHelp title="Справка по дашборду" items={dashboardHelp} />

      <FieldsMapWidget />
    </div>
  )
}
