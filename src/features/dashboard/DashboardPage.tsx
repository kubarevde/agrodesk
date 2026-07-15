import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { SystemStatus } from '@/components/shared/SystemStatus'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { dashboardHelp } from '@/features/help/content'
import { FieldsMapWidget } from './FieldsMapWidget'
import { ActiveShiftsSection } from './components/ActiveShiftsSection'
import { AgroPlanTodaySection } from './components/AgroPlanTodaySection'
import { CriticalInventorySection } from './components/CriticalInventorySection'
import { EquipmentWarningsSection } from './components/EquipmentWarningsSection'
import { FinanceCards, FinanceCardsSkeleton } from './components/FinanceCards'
import { KpiCards, KpiCardsSkeleton } from './components/KpiCards'
import { SharingDashboardSection } from './components/SharingDashboardSection'
import { WeeklyHoursChart, WeeklyHoursChartSkeleton } from './components/WeeklyHoursChart'
import { useDashboardStats } from './hooks'

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const isAdmin = user?.role === 'admin'
  const { data: stats, isLoading, isFetching, dataUpdatedAt, refetch } = useDashboardStats()
  const updatedLabel = dataUpdatedAt
    ? format(new Date(dataUpdatedAt), 'HH:mm:ss', { locale: ru })
    : '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <p className="text-sm text-muted-foreground">Обновлено в {updatedLabel}</p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Обновить дашборд"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RefreshCw className={isFetching ? 'size-4 animate-spin' : 'size-4'} />
          </Button>
        </div>
      </div>

      {isLoading || !stats ? <KpiCardsSkeleton /> : <KpiCards stats={stats} />}

      <SectionHelp title="Справка по дашборду" items={dashboardHelp} />

      <EquipmentWarningsSection
        items={stats?.equipmentWarnings ?? []}
        isLoading={isLoading}
      />

      <AgroPlanTodaySection items={stats?.agroPlanToday ?? []} isLoading={isLoading} />

      <FieldsMapWidget />

      <SharingDashboardSection
        newRequests={stats?.sharingNewRequests ?? 0}
        isLoadingStats={isLoading}
      />

      {isLoading || !stats ? <FinanceCardsSkeleton /> : <FinanceCards stats={stats} />}

      {isLoading || !stats ? (
        <WeeklyHoursChartSkeleton />
      ) : (
        <WeeklyHoursChart data={stats.weeklyHours} />
      )}

      <ActiveShiftsSection shifts={stats?.activeShifts ?? []} isLoading={isLoading} />

      <CriticalInventorySection
        items={stats?.criticalInventory ?? []}
        isLoading={isLoading}
      />

      {isAdmin ? <SystemStatus /> : null}
    </div>
  )
}
