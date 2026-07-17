import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { humanLabel, joinLabels } from '@/lib/display'
import { useDeleteAgroPlan } from '../hooks'
import type { AgroPlan } from '../types'
import { STATUS_LABELS } from '../types'
import { displayFromIsoDate, planFieldsLabel, statusBadgeClass } from '../utils'

type AgroPlanDetailSheetProps = {
  plan: AgroPlan | null
  open: boolean
  canManage: boolean
  onClose: () => void
  onDeleted?: () => void
  onEdit?: (plan: AgroPlan) => void
}

export function AgroPlanDetailSheet({
  plan,
  open,
  canManage,
  onClose,
  onDeleted,
  onEdit,
}: AgroPlanDetailSheetProps) {
  const deletePlan = useDeleteAgroPlan()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 639px)')

  if (!plan) return null

  const resources = joinLabels([plan.equipmentName, plan.implementName])
  const fieldsValue = planFieldsLabel(plan, 'Поле не указано')

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
              <Badge className={statusBadgeClass(plan.status)}>{STATUS_LABELS[plan.status]}</Badge>
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-4 pb-6 text-sm">
            <Row label="Поле" value={fieldsValue} />
            {plan.fieldNames.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {plan.fieldNames.map((name) => (
                  <Badge key={name} variant="outline" className="font-normal">
                    {humanLabel(name, 'Поле')}
                  </Badge>
                ))}
              </div>
            ) : null}
            <Row
              label="Дата"
              value={
                plan.plannedEndDate
                  ? `${displayFromIsoDate(plan.plannedDate)} — ${displayFromIsoDate(plan.plannedEndDate)}`
                  : displayFromIsoDate(plan.plannedDate)
              }
            />
            <Row label="Техника / приспособление" value={resources} />
            <Row label="Сотрудник" value={humanLabel(plan.employeeName, '—')} />
            {plan.notes ? <Row label="Комментарий" value={plan.notes} /> : null}
            {plan.actualShiftId ? (
              <Row label="Смена" value="Закрыта по этому плану" />
            ) : null}
          </div>

          {canManage ? (
            <SheetFooter className="flex flex-col gap-2 px-4 pb-6 sm:flex-col">
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
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить задачу?</DialogTitle>
            <DialogDescription>
              {humanLabel(plan.workTypeName, 'Работа')} на поле{' '}
              {planFieldsLabel(plan, 'без названия')} будет удалена из календаря.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePlan.isPending}
              onClick={() => void handleDelete()}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}
