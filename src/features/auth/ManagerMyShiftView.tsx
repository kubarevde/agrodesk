import { Link } from '@tanstack/react-router'
import { Clock, LayoutDashboard, Package, Play, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { useDashboardStats } from '@/features/dashboard/hooks'
import { useFields } from '@/features/fields/hooks'
import { GuideNudgeBanner } from '@/features/help/components/GuideNudgeBanner'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { myShiftHelp } from '@/features/help/content'
import { useImplements } from '@/features/implements/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { CloseShiftModal } from '@/features/worktime/CloseShiftModal'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import { useShifts } from '@/features/worktime/hooks'
import {
  useEmployees,
  useEquipment,
  useLocations,
  useWorkTypes,
} from '@/features/worktime/referenceHooks'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { hasAction, hasSection } from '@/lib/permissionActions'
import type { Shift } from '@/types'
import { CloseShiftForEmployeeDialog } from './CloseShiftForEmployeeDialog'
import { CurrentShiftCard } from './CurrentShiftCard'
import { formatMyShiftSubtitle } from './formatMyShiftSubtitle'
import { ManagerTeamBoardCard } from './ManagerTeamBoardCard'

const QUICK_LINKS = [
  { to: '/dashboard', section: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/worktime', section: 'worktime', label: 'Рабочее время', icon: Clock },
  { to: '/inventory', section: 'inventory', label: 'Склад ТМЦ', icon: Package },
] as const

function isOwnShift(shift: Shift, userId?: string, code?: string): boolean {
  if (userId && shift.employeeId === userId) return true
  return Boolean(code && shift.employeeCode === code)
}

function dashboardToShift(row: {
  id: string
  employeeName: string
  location: string
  startTime: string
  date: string
  durationMinutes: number
}): Shift {
  return {
    id: row.id,
    date: row.date || '',
    employeeCode: '',
    employeeName: row.employeeName,
    telegramId: '',
    startTime: row.startTime,
    endTime: null,
    workType: '',
    location: row.location,
    equipment: '',
    description: '',
    comment: '',
    status: 'open',
    durationRaw: row.durationMinutes,
    durationRounded: row.durationMinutes,
    latitude: null,
    longitude: null,
  }
}

export function ManagerMyShiftView({ embedded = false }: { embedded?: boolean }) {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const isOnline = useOnlineStatus()
  const sections = perms?.allowedSections
  const actions = perms?.actions
  const role = user?.role

  const canSeeTeamBoard = hasSection(sections, 'dashboard', role)
  const canOpenOwn = hasAction(actions, 'shift.open_own', role)
  const canCloseOwn = hasAction(actions, 'shift.close_own', role)
  const canOpenOthers = hasAction(actions, 'shift.open_for_others', role)
  const canCloseOthers = hasAction(actions, 'shift.close_others', role)

  useLocations()
  useWorkTypes()
  useEquipment()
  useEmployees()
  useFields()
  useImplements()

  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const { data: openShifts = [], isLoading: openLoading } = useShifts(
    { from: monthRange.from, to: monthRange.to, status: 'open' },
    { enabled: Boolean(user) },
  )
  const { data: stats, isLoading: statsLoading } = useDashboardStats({
    enabled: Boolean(canSeeTeamBoard) && isOnline,
  })

  const [ownOpen, setOwnOpen] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [pickCloseOpen, setPickCloseOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<Shift | null>(null)

  const ownShift =
    openShifts.find((s) => isOwnShift(s, user?.id, user?.employeeCode)) ?? null
  const othersOpen = useMemo(
    () => openShifts.filter((s) => !isOwnShift(s, user?.id, user?.employeeCode)),
    [openShifts, user?.employeeCode, user?.id],
  )
  const teamShifts = useMemo(() => {
    if (openShifts.length > 0) return openShifts
    return (stats?.activeShifts ?? []).map(dashboardToShift)
  }, [openShifts, stats?.activeShifts])

  const quickLinks = useMemo(
    () => QUICK_LINKS.filter((l) => hasSection(sections, l.section, role)),
    [sections, role],
  )
  const subtitle = formatMyShiftSubtitle(user)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {embedded ? null : <GuideNudgeBanner />}
      {embedded ? null : (
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Моя смена</h1>
          <p className="text-sm text-muted-foreground">
            {canSeeTeamBoard
              ? 'Смена и быстрые действия'
              : 'Открытие и закрытие собственной смены'}
            {subtitle ? ` · ${subtitle}` : ''}
          </p>
        </div>
      )}

      {embedded ? null : (
        <RoleSectionHelp section="моя смена" items={myShiftHelp} guideSection="my-shift" />
      )}

      {canOpenOwn || canCloseOwn ? (
        <CurrentShiftCard
          shift={ownShift}
          isLoading={openLoading}
          onStart={() => setOwnOpen(true)}
          onFinish={setCloseTarget}
        />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        {canOpenOthers ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOtherOpen(true)}
            className="min-h-14 w-full flex-1 whitespace-normal px-4 py-3 text-base leading-snug lg:min-h-12 lg:whitespace-nowrap"
          >
            <Play className="size-5 shrink-0" />
            Открыть смену за сотрудника
          </Button>
        ) : null}
        {canCloseOthers ? (
          <Button
            type="button"
            variant="outline"
            disabled={othersOpen.length === 0}
            onClick={() => setPickCloseOpen(true)}
            className="min-h-14 w-full flex-1 whitespace-normal px-4 py-3 text-base leading-snug lg:min-h-12 lg:whitespace-nowrap"
          >
            <Square className="size-5 shrink-0" />
            Закрыть смену за сотрудника
          </Button>
        ) : null}
      </div>

      {canSeeTeamBoard ? (
        <ManagerTeamBoardCard
          shifts={teamShifts}
          isLoading={Boolean(statsLoading && isOnline && openLoading)}
          isOnline={isOnline}
          canOpenOthers={canOpenOthers}
          canOpenOwn={canOpenOwn}
          canCloseOthers={canCloseOthers}
          currentUserId={user?.id}
          currentEmployeeCode={user?.employeeCode}
          onOpenOther={() => setOtherOpen(true)}
          onOpenOwn={() => setOwnOpen(true)}
          onCloseShift={setCloseTarget}
        />
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

      <OpenShiftModal open={ownOpen} onClose={() => setOwnOpen(false)} selectEmployee={false} />
      <OpenShiftModal open={otherOpen} onClose={() => setOtherOpen(false)} selectEmployee />
      <CloseShiftForEmployeeDialog
        open={pickCloseOpen}
        shifts={othersOpen}
        onClose={() => setPickCloseOpen(false)}
        onSelect={setCloseTarget}
      />
      {closeTarget ? (
        <CloseShiftModal
          shiftId={closeTarget.id}
          employeeId={closeTarget.employeeId ?? user?.id}
          startTime={closeTarget.startTime}
          shiftDate={closeTarget.date}
          equipmentName={closeTarget.equipment || undefined}
          equipmentMeterType={closeTarget.equipmentMeterType}
          open={Boolean(closeTarget)}
          onClose={() => setCloseTarget(null)}
        />
      ) : null}
    </div>
  )
}
