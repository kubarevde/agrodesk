import { CloseShiftModal } from '@/features/worktime/CloseShiftModal'
import { ShiftDetailModal } from '@/features/worktime/ShiftDetailModal'
import { AddShiftModal } from '@/features/worktime/AddShiftModal'
import { OpenShiftModal } from '@/features/worktime/OpenShiftModal'
import type { Shift } from '@/types'
import { DeleteShiftDialog } from './DeleteShiftDialog'

type WorktimeModalsProps = {
  selectedShift: Shift | null
  detailOpen: boolean
  onDetailClose: () => void
  canDelete: boolean
  onRequestDelete: (shift: Shift) => void
  openShiftOpen: boolean
  onOpenShiftClose: () => void
  addShiftOpen: boolean
  onAddShiftClose: () => void
  isManager: boolean
  closeShiftTarget: Shift | null
  onCloseShiftClear: () => void
  deleteTarget: Shift | null
  deletePending: boolean
  onDeleteOpenChange: (open: boolean) => void
  onConfirmDelete: () => void
}

export function WorktimeModals({
  selectedShift,
  detailOpen,
  onDetailClose,
  canDelete,
  onRequestDelete,
  openShiftOpen,
  onOpenShiftClose,
  addShiftOpen,
  onAddShiftClose,
  isManager,
  closeShiftTarget,
  onCloseShiftClear,
  deleteTarget,
  deletePending,
  onDeleteOpenChange,
  onConfirmDelete,
}: WorktimeModalsProps) {
  return (
    <>
      {selectedShift ? (
        <ShiftDetailModal
          shift={selectedShift}
          open={detailOpen}
          onClose={onDetailClose}
          onDelete={canDelete ? onRequestDelete : undefined}
        />
      ) : null}
      <OpenShiftModal open={openShiftOpen} onClose={onOpenShiftClose} />
      {isManager ? <AddShiftModal open={addShiftOpen} onClose={onAddShiftClose} /> : null}
      <CloseShiftModal
        shiftId={closeShiftTarget?.id ?? ''}
        employeeId={closeShiftTarget?.employeeId}
        startTime={closeShiftTarget?.startTime ?? ''}
        shiftDate={closeShiftTarget?.date}
        equipmentName={closeShiftTarget?.equipment || undefined}
        equipmentMeterType={closeShiftTarget?.equipmentMeterType}
        open={Boolean(closeShiftTarget)}
        onClose={onCloseShiftClear}
        onSuccess={onCloseShiftClear}
      />
      <DeleteShiftDialog
        shift={deleteTarget}
        open={Boolean(deleteTarget)}
        pending={deletePending}
        onOpenChange={onDeleteOpenChange}
        onConfirm={onConfirmDelete}
      />
    </>
  )
}
