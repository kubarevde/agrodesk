import { Link } from '@tanstack/react-router'
import { Clock, LayoutDashboard, Package, Play, Users } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardStats } from '@/features/dashboard/hooks'
import { ActiveShiftLiveDuration } from '@/features/dashboard/components/ActiveShiftLiveDuration'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import { formatShiftTime } from '@/features/worktime/utils'

const QUICK_LINKS = [
  { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/worktime', label: 'Рабочее время', icon: Clock },
  { to: '/inventory', label: 'Склад ТМЦ', icon: Package },
] as const

export function ManagerMyShiftView() {
  const { data: stats, isLoading } = useDashboardStats()
  const [openShiftOpen, setOpenShiftOpen] = useState(false)
  const activeShifts = stats?.activeShifts ?? []

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Моя смена</h1>
        <p className="text-sm text-muted-foreground">Мини-дашборд руководителя</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Кто сейчас работает</CardTitle>
          <Button
            type="button"
            onClick={() => setOpenShiftOpen(true)}
            className="h-12 w-full bg-primary hover:bg-primary-hover text-primary-foreground sm:h-11 sm:w-auto"
          >
            <Play className="size-4" />
            Открыть смену за сотрудника
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={3} columns={3} />
          ) : activeShifts.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Сейчас никто не работает"
              description="Откройте смену за сотрудника"
              action={{
                label: 'Открыть смену за сотрудника',
                onClick: () => setOpenShiftOpen(true),
              }}
            />
          ) : (
            <div className="space-y-3">
              {activeShifts.map((shift) => (
                <article
                  key={shift.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <p className="font-medium text-foreground">{shift.employeeName}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <span>Объект</span>
                    <span className="text-right text-foreground">{shift.location}</span>
                    <span>Начало</span>
                    <span className="text-right text-foreground">
                      {formatShiftTime(shift.startTime)}
                    </span>
                    <span>Отработано</span>
                    <span className="text-right text-foreground">
                      <ActiveShiftLiveDuration shift={shift} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Быстрые ссылки</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Icon className="size-4 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <OpenShiftModal
        open={openShiftOpen}
        onClose={() => setOpenShiftOpen(false)}
        selectEmployee
      />
    </div>
  )
}
