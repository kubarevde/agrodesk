import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { humanLabel } from '@/lib/display'
import { useDeleteAgroPlan } from '../hooks'
import type { AgroPlan } from '../types'
import { ENTRY_KIND_LABELS, STATUS_LABELS } from '../types'
import { entryKindBadgeClass, isCalendarFact, statusBadgeClass } from '../utils'
import { PlanWeatherAdvisoryBadge } from './PlanWeatherAdvisoryBadge'
import { AgroPlanActions } from './AgroPlanActions'
import { AgroPlanDeleteDialog } from './AgroPlanDeleteDialog'
import { AgroPlanDetailFields } from './AgroPlanDetailFields'

type AgroPlanDetailSheetProps = {
  plan: AgroPlan | null
  open: boolean
  canManage: boolean
  isAdmin?: boolean
  onClose: () => void
  onDeleted?: () => void
  onEdit?: (plan: AgroPlan) => void
  onPlanUpdated?: (plan: AgroPlan) => void
}

export function AgroPlanDetailSheet({
  plan,
  open,
  canManage,
  isAdmin = false,
  onClose,
  onDeleted,
  onEdit,
  onPlanUpdated,
}: AgroPlanDetailSheetProps) {
  const deletePlan = useDeleteAgroPlan()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 639px)')

  if (!plan) return null

  const canEditPlan = canManage && !isCalendarFact(plan)

  const handleDelete = async () => {
    await deletePlan.mutateAsync(plan.id)
    setConfirmOpen(false)
    onClose()
    onDeleted?.()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetHeader>
            <SheetTitle>{humanLabel(plan.workTypeName, 'Работа')}</SheetTitle>
            <SheetDescription className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="outline" className={entryKindBadgeClass(plan.entryKind)}>
                {ENTRY_KIND_LABELS[plan.entryKind]}
              </Badge>
              <Badge variant="outline" className={statusBadgeClass(plan.status)}>
                {STATUS_LABELS[plan.status]}
              </Badge>
              <PlanWeatherAdvisoryBadge advisories={plan.advisories} />
            </SheetDescription>
          </SheetHeader>

          <AgroPlanDetailFields plan={plan} />

          <SheetFooter className="flex flex-col gap-2 px-4 pb-6 sm:flex-col">
            <AgroPlanActions
              plan={plan}
              canManage={canManage}
              isAdmin={isAdmin}
              onChanged={(updated) => onPlanUpdated?.(updated)}
            />
            {canEditPlan ? (
              <>
                {onEdit ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => onEdit(plan)}>
                    <Pencil className="size-4" />
                    Редактировать
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-destructive"
                  disabled={deletePlan.isPending}
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Удалить задачу
                </Button>
              </>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AgroPlanDeleteDialog
        plan={plan}
        open={confirmOpen}
        pending={deletePlan.isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
