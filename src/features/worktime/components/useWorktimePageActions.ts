import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useDeleteShift } from '@/features/worktime/hooks'
import type { Shift } from '@/types'
import type { ShiftRowActions } from './shiftsColumns'

type UseWorktimePageActionsArgs = {
  isAdmin: boolean
  isManager: boolean
  userId?: string
  onOpenDetails: (shift: Shift) => void
  onDetailClosedIfDeleted: (shiftId: string) => void
}

export function useWorktimePageActions({
  isAdmin,
  isManager,
  userId,
  onOpenDetails,
  onDetailClosedIfDeleted,
}: UseWorktimePageActionsArgs) {
  const isOnline = useOnlineStatus()
  const canDelete = isAdmin && isOnline
  const deleteShift = useDeleteShift()
  const [closeShiftTarget, setCloseShiftTarget] = useState<Shift | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Shift | null>(null)

  const requestDelete = useCallback(
    (shift: Shift) => {
      if (!isOnline) {
        toast.error('Удаление смены доступно только онлайн')
        return
      }
      setDeleteTarget(shift)
    },
    [isOnline],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    await deleteShift.mutateAsync(deleteTarget.id)
    onDetailClosedIfDeleted(deleteTarget.id)
    setDeleteTarget(null)
  }, [deleteShift, deleteTarget, onDetailClosedIfDeleted])

  const actions = useMemo<ShiftRowActions>(
    () => ({
      onDetails: onOpenDetails,
      onClose: (shift) => setCloseShiftTarget(shift),
      onDelete: canDelete ? requestDelete : undefined,
      canClose: (shift) =>
        isManager || (Boolean(shift.employeeId) && shift.employeeId === userId),
    }),
    [canDelete, isManager, onOpenDetails, requestDelete, userId],
  )

  return {
    canDelete,
    actions,
    closeShiftTarget,
    setCloseShiftTarget,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    deletePending: deleteShift.isPending,
    requestDelete,
  }
}
