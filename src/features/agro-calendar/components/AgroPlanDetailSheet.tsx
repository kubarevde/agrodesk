import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { AgroPlan } from '../types'
import { STATUS_LABELS } from '../types'
import { displayFromIsoDate, statusBadgeClass } from '../utils'

type AgroPlanDetailSheetProps = {
  plan: AgroPlan | null
  open: boolean
  onClose: () => void
}

export function AgroPlanDetailSheet({ plan, open, onClose }: AgroPlanDetailSheetProps) {
  if (!plan) return null

  const resources = [plan.equipmentName, plan.implementName].filter(Boolean).join(' + ') || '—'

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{plan.workTypeName}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-1.5 pt-1">
            <Badge className={statusBadgeClass(plan.status)}>{STATUS_LABELS[plan.status]}</Badge>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-6 text-sm">
          <Row label="Поле" value={plan.fieldName} />
          <Row
            label="Дата"
            value={
              plan.plannedEndDate
                ? `${displayFromIsoDate(plan.plannedDate)} — ${displayFromIsoDate(plan.plannedEndDate)}`
                : displayFromIsoDate(plan.plannedDate)
            }
          />
          <Row label="Техника / приспособление" value={resources} />
          <Row label="Сотрудник" value={plan.employeeName || '—'} />
          {plan.notes ? <Row label="Примечания" value={plan.notes} /> : null}
          {plan.actualShiftId ? (
            <Row label="Смена" value="Закрыта по этому плану" />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
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
