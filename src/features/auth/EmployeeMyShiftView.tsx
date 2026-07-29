import { useMemo, useState } from 'react'
import type { CurrentUser } from '@/lib/transformers'
import type { Shift } from '@/types'
import { CloseShiftModal } from '@/features/worktime/CloseShiftModal'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import { ShiftDetailModal } from '@/features/worktime/ShiftDetailModal'
import { useShifts } from '@/features/worktime/hooks'
import {
  useEquipment,
  useLocations,
  useWorkTypes,
} from '@/features/worktime/referenceHooks'
import { useFields } from '@/features/fields/hooks'
import { getDefaultMonthRange } from '@/features/worktime/utils'
import { GuideNudgeBanner } from '@/features/help/components/GuideNudgeBanner'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { myShiftHelp } from '@/features/help/content'
import { CurrentShiftCard } from './CurrentShiftCard'
import { EmployeeAgroTodaySection } from './EmployeeAgroTodaySection'
import { EmployeeSectionLinks } from './EmployeeSectionLinks'
import { MonthShiftsList } from './MonthShiftsList'
import { MyEarningsSection } from './MyEarningsSection'

interface EmployeeMyShiftViewProps {
  user: CurrentUser
}

export function EmployeeMyShiftView({ user }: EmployeeMyShiftViewProps) {
  const monthRange = useMemo(() => getDefaultMonthRange(), [])
  const openFilters = useMemo(
    () => ({ employeeId: user.id, status: 'open' as const }),
    [user.id],
  )
  const monthFilters = useMemo(
    () => ({
      employeeId: user.id,
      from: monthRange.from,
      to: monthRange.to,
    }),
    [monthRange.from, monthRange.to, user.id],
  )

  // Prefetch/warm Dexie while online so open-shift works later without network.
  useLocations()
  useWorkTypes()
  useEquipment()
  useFields()

  const { data: openShifts = [], isLoading: openLoading } = useShifts(openFilters)
  const { data: monthShifts = [], isLoading: monthLoading } = useShifts(monthFilters)

  const activeShift = openShifts.find((shift) => shift.status === 'open') ?? null
  const [openShiftOpen, setOpenShiftOpen] = useState(false)
  const [closeShiftTarget, setCloseShiftTarget] = useState<Shift | null>(null)
  const [detailShift, setDetailShift] = useState<Shift | null>(null)

  return (
    <div className="mx-auto w-full max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Моя смена</h1>
        <p className="text-sm text-muted-foreground">{user.fullName}</p>
      </div>

      <GuideNudgeBanner />

      <RoleSectionHelp section="моя смена" items={myShiftHelp} guideSection="my-shift" />

      <CurrentShiftCard
        shift={activeShift}
        isLoading={openLoading}
        onStart={() => setOpenShiftOpen(true)}
        onFinish={setCloseShiftTarget}
      />

      <EmployeeSectionLinks />

      <EmployeeAgroTodaySection employeeId={user.id} />

      {monthLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" />
      ) : (
        <MonthShiftsList shifts={monthShifts} onDetails={setDetailShift} />
      )}

      <MyEarningsSection />

      <OpenShiftModal open={openShiftOpen} onClose={() => setOpenShiftOpen(false)} />
      {closeShiftTarget ? (
        <CloseShiftModal
          shiftId={closeShiftTarget.id}
          employeeId={closeShiftTarget.employeeId ?? user.id}
          startTime={closeShiftTarget.startTime}
          shiftDate={closeShiftTarget.date}
          equipmentName={closeShiftTarget.equipment || undefined}
          equipmentMeterType={closeShiftTarget.equipmentMeterType}
          open={Boolean(closeShiftTarget)}
          onClose={() => setCloseShiftTarget(null)}
        />
      ) : null}
      {detailShift ? (
        <ShiftDetailModal
          shift={detailShift}
          open={Boolean(detailShift)}
          onClose={() => setDetailShift(null)}
        />
      ) : null}
    </div>
  )
}
