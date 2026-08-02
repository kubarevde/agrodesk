import { Clock, Download, Play, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { StaleCacheNotice } from '@/components/shared/StaleCacheNotice'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { worktimeHelp } from '@/features/help/modules'
import { REPORT_DEFINITIONS } from '@/features/reports/reportDefinitions'
import { buildReportFilename, downloadReport } from '@/features/reports/utils'
import { displayDateToIso } from '@/lib/transformers'
import { useShifts } from '@/features/worktime/hooks'
import { useEmployees } from '@/features/worktime/referenceHooks'
import { useWorktimeFilters } from '@/features/worktime/useWorktimeFilters'
import { calcTotalHours } from '@/features/worktime/utils'
import type { Shift } from '@/types'
import { ShiftsCardList } from './ShiftsCardList'
import { ShiftsFilters } from './ShiftsFilters'
import { ShiftsTable } from './ShiftsTable'
import { useWorktimePageActions } from './useWorktimePageActions'
import { WorktimeModals } from './WorktimeModals'

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
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [openShiftOpen, setOpenShiftOpen] = useState(false)
  const [addShiftOpen, setAddShiftOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const openDetails = useCallback((shift: Shift) => {
    setSelectedShift(shift)
    setDetailOpen(true)
  }, [])

  const pageActions = useWorktimePageActions({
    isAdmin,
    isManager,
    userId: user?.id,
    onOpenDetails: openDetails,
    onDetailClosedIfDeleted: (shiftId) => {
      if (selectedShift?.id === shiftId) {
        setDetailOpen(false)
        setSelectedShift(null)
      }
    },
  })

  useEffect(() => {
    if (isError) toast.error('Ошибка: Не удалось загрузить смены')
  }, [isError])

  const handleExport = async () => {
    if (!TIMESHEET_REPORT) return
    setExporting(true)
    try {
      await downloadReport(
        TIMESHEET_REPORT.endpoint,
        {
          from_date: displayDateToIso(from),
          to_date: displayDateToIso(to),
          ...(employeeId ? { employee_id: employeeId } : {}),
        },
        buildReportFilename(TIMESHEET_REPORT, { from, to, month: '' }),
      )
      toast.success('Файл скачан')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось скачать Excel'
      toast.error(`Ошибка: ${message}`)
    } finally {
      setExporting(false)
    }
  }

  const totalHours = calcTotalHours(safeShifts)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Рабочее время</h1>
        <div className="flex flex-wrap gap-2">
          {isManager ? (
            <Button type="button" variant="outline" onClick={() => setAddShiftOpen(true)}>
              <Plus className="size-4" />
              Добавить смену
            </Button>
          ) : null}
          <Button
            onClick={() => setOpenShiftOpen(true)}
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

      <RoleSectionHelp section="смены" items={worktimeHelp} guideSection="worktime" />

      <StaleCacheNotice detail="Офлайн: список смен из кэша устройства. Новые открытие/закрытие уйдут на сервер при появлении сети." />

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
          action={{ label: 'Открыть смену', onClick: () => setOpenShiftOpen(true) }}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <ShiftsTable shifts={safeShifts} actions={pageActions.actions} />
          </div>
          <div className="md:hidden">
            <ShiftsCardList
              shifts={safeShifts}
              onDetails={openDetails}
              onDelete={pageActions.canDelete ? pageActions.requestDelete : undefined}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Итого: {safeShifts.length} смен / {totalHours} часов за период
          </p>
        </>
      )}

      <WorktimeModals
        selectedShift={selectedShift}
        detailOpen={detailOpen}
        onDetailClose={() => setDetailOpen(false)}
        canDelete={pageActions.canDelete}
        onRequestDelete={pageActions.requestDelete}
        openShiftOpen={openShiftOpen}
        onOpenShiftClose={() => setOpenShiftOpen(false)}
        addShiftOpen={addShiftOpen}
        onAddShiftClose={() => setAddShiftOpen(false)}
        isManager={isManager}
        closeShiftTarget={pageActions.closeShiftTarget}
        onCloseShiftClear={() => pageActions.setCloseShiftTarget(null)}
        deleteTarget={pageActions.deleteTarget}
        deletePending={pageActions.deletePending}
        onDeleteOpenChange={(open) => {
          if (!open) pageActions.setDeleteTarget(null)
        }}
        onConfirmDelete={() => void pageActions.confirmDelete()}
      />
    </div>
  )
}
