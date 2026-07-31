import { Link } from '@tanstack/react-router'
import { Clock, LayoutDashboard, Package, Play, User, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/features/auth/hooks'
import { ActiveShiftLiveDuration } from '@/features/dashboard/components/ActiveShiftLiveDuration'
import { useDashboardStats } from '@/features/dashboard/hooks'
import { useFields } from '@/features/fields/hooks'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { myShiftHelp } from '@/features/help/content'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import { useShifts } from '@/features/worktime/hooks'
import {
  useEmployees,
  useEquipment,
  useLocations,
  useWorkTypes,
} from '@/features/worktime/referenceHooks'
import { formatShiftTime, getDefaultMonthRange } from '@/features/worktime/utils'
import { hasAction, hasSection } from '@/lib/permissionActions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { DashboardActiveShift } from '@/types'

const QUICK_LINK_DEFS = [
  { to: '/dashboard', section: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/worktime', section: 'worktime', label: 'Рабочее время', icon: Clock },
  { to: '/inventory', section: 'inventory', label: 'Склад ТМЦ', icon: Package },
] as const

export function ManagerMyShiftView() {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const isOnline = useOnlineStatus()
  const sections = perms?.allowedSections
  const actions = perms?.actions
  const role = user?.role

  const canSeeTeamBoard = hasSection(sections, 'dashboard', role)
  const canOpenOwn = hasAction(actions, 'shift.open_own', role)
  const canOpenOthers = hasAction(actions, 'shift.open_for_others', role)

  // Warm Dexie while online so offline open-shift + team list work later.
  useLocations()
  useWorkTypes()
  useEquipment()
  useEmployees()
  useFields()
  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const { data: cachedOpenShifts = [] } = useShifts(
    { from: monthRange.from, to: monthRange.to, status: 'open' },
    { enabled: Boolean(user) },
  )

  const { data: stats, isLoading } = useDashboardStats({
    enabled: Boolean(canSeeTeamBoard) && isOnline,
  })
  const [openOwnOpen, setOpenOwnOpen] = useState(false)
  const [openOtherOpen, setOpenOtherOpen] = useState(false)

  const activeShifts: DashboardActiveShift[] = useMemo(() => {
    if (stats?.activeShifts?.length) return stats.activeShifts
    return cachedOpenShifts.map((shift) => ({
      id: shift.id,
      employeeName: shift.employeeName,
      location: shift.location,
      startTime: shift.startTime,
      date: shift.date,
      durationMinutes: shift.durationRounded ?? shift.durationRaw ?? 0,
    }))
  }, [stats?.activeShifts, cachedOpenShifts])

  const quickLinks = useMemo(
    () =>
      QUICK_LINK_DEFS.filter((link) => hasSection(sections, link.section, role)),
    [sections, role],
  )

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Моя смена</h1>
        <p className="text-sm text-muted-foreground">
          {canSeeTeamBoard
            ? 'Смена и быстрые действия'
            : 'Открытие и закрытие собственной смены'}
          {user?.employeeCode ? ` · ${user.employeeCode}` : ''}
        </p>
      </div>

      <RoleSectionHelp section="моя смена" items={myShiftHelp} guideSection="my-shift" />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {canOpenOwn ? (
          <Button
            type="button"
            onClick={() => setOpenOwnOpen(true)}
            className="min-h-14 w-full flex-1 whitespace-normal px-4 py-3 text-base leading-snug bg-primary hover:bg-primary-hover text-primary-foreground lg:min-h-12 lg:whitespace-nowrap"
          >
            <User className="size-5 shrink-0" />
            Открыть свою смену
          </Button>
        ) : null}
        {canOpenOthers ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpenOtherOpen(true)}
            className="min-h-14 w-full flex-1 whitespace-normal px-4 py-3 text-base leading-snug lg:min-h-12 lg:whitespace-nowrap"
          >
            <Play className="size-5 shrink-0" />
            Открыть смену за сотрудника
          </Button>
        ) : null}
      </div>

      {canSeeTeamBoard ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-semibold">Кто сейчас работает</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && isOnline ? (
              <SkeletonTable rows={3} columns={3} />
            ) : activeShifts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Сейчас никто не работает"
                description={
                  !isOnline
                    ? 'Офлайн: список из кэша пуст. Откройте приложение онлайн, чтобы обновить.'
                    : canOpenOthers
                      ? 'Откройте смену за сотрудника'
                      : 'Откройте свою смену, когда начнёте работу'
                }
                action={
                  canOpenOthers
                    ? {
                        label: 'Открыть смену за сотрудника',
                        onClick: () => setOpenOtherOpen(true),
                      }
                    : canOpenOwn
                      ? {
                          label: 'Открыть свою смену',
                          onClick: () => setOpenOwnOpen(true),
                        }
                      : undefined
                }
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
      ) : null}

      {quickLinks.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Быстрые ссылки</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickLinks.map(({ to, label, icon: Icon }) => (
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
      ) : null}

      <OpenShiftModal
        open={openOwnOpen}
        onClose={() => setOpenOwnOpen(false)}
        selectEmployee={false}
      />
      <OpenShiftModal
        open={openOtherOpen}
        onClose={() => setOpenOtherOpen(false)}
        selectEmployee
      />
    </div>
  )
}
