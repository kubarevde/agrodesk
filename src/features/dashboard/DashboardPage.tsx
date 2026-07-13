import { ActiveShiftsSection } from './components/ActiveShiftsSection'
import { KpiCards, KpiCardsSkeleton } from './components/KpiCards'
import { WeeklyHoursChart, WeeklyHoursChartSkeleton } from './components/WeeklyHoursChart'
import { useDashboardStats, useIsAdmin } from './hooks'

export function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats()
  const isAdmin = useIsAdmin()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>

      {isLoading || !stats ? <KpiCardsSkeleton /> : <KpiCards stats={stats} />}

      {isLoading || !stats ? (
        <WeeklyHoursChartSkeleton />
      ) : (
        <WeeklyHoursChart data={stats.weeklyHours} />
      )}

      <ActiveShiftsSection
        shifts={stats?.activeShifts ?? []}
        isAdmin={isAdmin}
        isLoading={isLoading}
      />
    </div>
  )
}
