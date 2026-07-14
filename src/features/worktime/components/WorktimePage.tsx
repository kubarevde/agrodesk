import { Clock, Download, Play, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { REPORT_DEFINITIONS } from '@/features/reports/reportDefinitions'
import { buildReportFilename, downloadReport } from '@/features/reports/utils'
import { displayDateToIso } from '@/lib/transformers'
import {
  useDeleteShift,
  useShifts,
} from '@/features/worktime/hooks'
import { CloseShiftModal } from '@/features/worktime/CloseShiftModal'
import { ShiftDetailModal } from '@/features/worktime/ShiftDetailModal'
import { AddShiftModal } from '@/features/worktime/AddShiftModal'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import { useEmployees } from '@/features/worktime/referenceHooks'
import { useWorktimeFilters } from '@/features/worktime/useWorktimeFilters'
import { calcTotalHours } from '@/features/worktime/utils'
import type { Shift } from '@/types'
import { ShiftsCardList } from './ShiftsCardList'
import { ShiftsFilters } from './ShiftsFilters'
import { ShiftsTable } from './ShiftsTable'
import type { ShiftRowActions } from './shiftsColumns'

const TIMESHEET_REPORT = REPORT_DEFINITIONS.find((report) => report.id === 'timesheet')

export function WorktimePage() {
  const { data: user } = useCurrentUser()
  const isManager = user?.role === 'admin' || user?.role === 'manager'
  const isAdmin = user?.role === 'admin'
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
  const deleteShift = useDeleteShift()
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [closeShiftTarget, setCloseShiftTarget] = useState<Shift | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [openShiftOpen, setOpenShiftOpen] = useState(false)
  const [addShiftOpen, setAddShiftOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleOpenShift = () => setOpenShiftOpen(true)
  const handleAddShift = () => setAddShiftOpen(true)

  const handleExport = async () => {
    if (!TIMESHEET_REPORT) return
    setExporting(true)
    try {
      const params = { from, to, month: '' }
      await downloadReport(
        TIMESHEET_REPORT.endpoint,
        {
          from_date: displayDateToIso(from),
          to_date: displayDateToIso(to),
          ...(employeeId ? { employee_id: employeeId } : {}),
        },
        buildReportFilename(TIMESHEET_REPORT, params),
      )
      toast.success('📥 Файл скачан')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось скачать Excel'
      toast.error(`Ошибка: ${message}`)
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    if (isError) {
      toast.error('Ошибка: Не удалось загрузить смены')
    }
  }, [isError])

  const openDetails = useCallback((shift: Shift) => {
    setSelectedShift(shift)
    setDetailOpen(true)
  }, [])

  const actions = useMemo<ShiftRowActions>(
    () => ({
      onDetails: openDetails,
      onClose: (shift) => setCloseShiftTarget(shift),
      onDelete: isAdmin ? (shift) => deleteShift.mutate(shift.id) : undefined,
      canClose: (shift) =>
        isManager || (Boolean(shift.employeeId) && shift.employeeId === user?.id),
    }),
    [deleteShift, isAdmin, isManager, openDetails, user?.id],
  )

  const totalHours = calcTotalHours(safeShifts)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Рабочее время</h1>
        <div className="flex flex-wrap gap-2">
          {isManager ? (
            <Button type="button" variant="outline" onClick={handleAddShift}>
              <Plus className="size-4" />
              Добавить смену
            </Button>
          ) : null}
          <Button
            onClick={handleOpenShift}
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Play className="size-4" />
            Открыть смену
          </Button>
          {isManager ? (
            <Button
              type="button"
              variant="secondary"
              disabled={exporting}
              onClick={() => void handleExport()}
            >
              <Download className="size-4" />
              Экспорт Excel
            </Button>
          ) : null}
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
        <SkeletonTable />
      ) : safeShifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Смен за период нет"
          description="Откройте первую смену или измените фильтры"
          action={{ label: 'Открыть смену', onClick: handleOpenShift }}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <ShiftsTable shifts={safeShifts} actions={actions} />
          </div>
          <div className="md:hidden">
            <ShiftsCardList shifts={safeShifts} onDetails={openDetails} />
          </div>
          <p className="text-sm text-muted-foreground">
            Итого: {safeShifts.length} смен / {totalHours} часов за период
          </p>
        </>
      )}

      {selectedShift ? (
        <ShiftDetailModal
          shift={selectedShift}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}

      <OpenShiftModal open={openShiftOpen} onClose={() => setOpenShiftOpen(false)} />
      {isManager ? (
        <AddShiftModal open={addShiftOpen} onClose={() => setAddShiftOpen(false)} />
      ) : null}
      <CloseShiftModal
        shiftId={closeShiftTarget?.id ?? ''}
        employeeId={closeShiftTarget?.employeeId}
        startTime={closeShiftTarget?.startTime ?? ''}
        shiftDate={closeShiftTarget?.date}
        equipmentName={closeShiftTarget?.equipment || undefined}
        equipmentMeterType={closeShiftTarget?.equipmentMeterType}
        open={Boolean(closeShiftTarget)}
        onClose={() => setCloseShiftTarget(null)}
        onSuccess={() => setCloseShiftTarget(null)}
      />
    </div>
  )
}
