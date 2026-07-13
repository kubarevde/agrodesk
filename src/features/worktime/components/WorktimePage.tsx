import { Download, Play, Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  useCloseShift,
  useDeleteShift,
  useShifts,
} from '@/features/worktime/hooks'
import { ShiftDetailModal } from '@/features/worktime/ShiftDetailModal'
import { AddShiftModal } from '@/features/worktime/AddShiftModal'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import { useEmployees } from '@/features/worktime/referenceHooks'
import { useWorktimeFilters } from '@/features/worktime/useWorktimeFilters'
import { calcTotalHours } from '@/features/worktime/utils'
import type { Shift } from '@/types'
import { ShiftsCardList } from './ShiftsCardList'
import { ShiftsEmptyState } from './ShiftsEmptyState'
import { ShiftsFilters } from './ShiftsFilters'
import { ShiftsTable } from './ShiftsTable'
import { ShiftsTableSkeleton } from './ShiftsTableSkeleton'
import type { ShiftRowActions } from './shiftsColumns'

export function WorktimePage() {
  const {
    from,
    to,
    employeeId,
    status,
    filters,
    hasActiveFilters,
    setFrom,
    setTo,
    setEmployeeId,
    setStatus,
    resetFilters,
  } = useWorktimeFilters()

  const { data: shifts = [], isLoading, isError } = useShifts(filters)
  const safeShifts = Array.isArray(shifts) ? shifts : []
  const { data: employees = [] } = useEmployees()
  const closeShift = useCloseShift()
  const deleteShift = useDeleteShift()
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [openShiftOpen, setOpenShiftOpen] = useState(false)
  const [addShiftOpen, setAddShiftOpen] = useState(false)

  const handleOpenShift = () => setOpenShiftOpen(true)
  const handleAddShift = () => setAddShiftOpen(true)
  const handleExport = () => toast.info('Экспорт Excel скоро будет доступен')

  const openDetails = useCallback((shift: Shift) => {
    setSelectedShift(shift)
    setDetailOpen(true)
  }, [])

  const actions = useMemo<ShiftRowActions>(
    () => ({
      onDetails: openDetails,
      onClose: (shift) =>
        closeShift.mutate({
          id: shift.id,
          endTime: new Date().toTimeString().slice(0, 8),
          status: 'closed',
        }),
      onDelete: (shift) => deleteShift.mutate(shift.id),
    }),
    [closeShift, deleteShift, openDetails],
  )

  const handleDetails = useCallback(
    (shift: Shift) => {
      openDetails(shift)
    },
    [openDetails],
  )

  const totalHours = calcTotalHours(safeShifts)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Рабочее время</h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleAddShift}>
            <Plus className="size-4" />
            Добавить смену
          </Button>
          <Button
            onClick={handleOpenShift}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Play className="size-4" />
            Открыть смену
          </Button>
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Download className="size-4" />
            Экспорт Excel
          </Button>
        </div>
      </div>

      <ShiftsFilters
        from={from}
        to={to}
        employeeId={employeeId}
        status={status}
        employees={employees}
        hasActiveFilters={hasActiveFilters}
        onFromChange={(value) => setFrom(value ?? from)}
        onToChange={(value) => setTo(value ?? to)}
        onEmployeeChange={setEmployeeId}
        onStatusChange={setStatus}
        onReset={resetFilters}
      />

      {isLoading ? (
        <ShiftsTableSkeleton />
      ) : safeShifts.length === 0 ? (
        <ShiftsEmptyState onOpenShift={handleOpenShift} />
      ) : (
        <>
          <div className="hidden md:block">
            <ShiftsTable shifts={safeShifts} actions={actions} />
          </div>
          <div className="md:hidden">
            <ShiftsCardList shifts={safeShifts} onDetails={handleDetails} />
          </div>
          <p className="text-sm text-muted-foreground">
            Итого: {safeShifts.length} смен / {totalHours} часов за период
          </p>
        </>
      )}
      {isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить смены</p>
      ) : null}

      {selectedShift ? (
        <ShiftDetailModal
          shift={selectedShift}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}

      <OpenShiftModal open={openShiftOpen} onClose={() => setOpenShiftOpen(false)} />
      <AddShiftModal open={addShiftOpen} onClose={() => setAddShiftOpen(false)} />
    </div>
  )
}
