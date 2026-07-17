import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarDays, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { humanLabel, joinLabels } from '@/lib/display'
import { useAgroPlans } from '../hooks'
import type { AgroPlan } from '../types'
import { STATUS_LABELS } from '../types'
import { planFieldsLabel, statusBadgeClass, workTypeBadgeClass } from '../utils'

type AgroCalendarDaySheetProps = {
  day: string | null
  fieldId?: string
  open: boolean
  canManage?: boolean
  onClose: () => void
  onSelectPlan: (plan: AgroPlan) => void
  onAddPlan?: (day: string) => void
}

export function AgroCalendarDaySheet({
  day,
  fieldId,
  open,
  canManage = false,
  onClose,
  onSelectPlan,
  onAddPlan,
}: AgroCalendarDaySheetProps) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const monthKey = day?.slice(0, 7)
  const { data: plans = [], isLoading } = useAgroPlans(
    day && monthKey ? { month: monthKey, fieldId, plannedDate: day } : {},
    { enabled: open && Boolean(day && monthKey) },
  )

  const titleDate = day
    ? format(parseISO(day), 'd MMMM yyyy', { locale: ru })
    : ''

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Задачи на {titleDate}</SheetTitle>
          <SheetDescription>
            {plans.length > 0
              ? `${plans.length} ${plans.length === 1 ? 'задача' : plans.length < 5 ? 'задачи' : 'задач'}`
              : 'Нет запланированных работ'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-6">
          {canManage && day && onAddPlan ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => onAddPlan(day)}>
              <Plus className="size-4" />
              Добавить задачу на эту дату
            </Button>
          ) : null}

          {isLoading ? (
            <PageSkeleton />
          ) : plans.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              <CalendarDays className="size-4 shrink-0" />
              На этот день работ не запланировано
            </div>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                onClick={() => onSelectPlan(plan)}
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <Badge
                    variant="outline"
                    className={workTypeBadgeClass(humanLabel(plan.workTypeName, 'Работа'))}
                  >
                    {humanLabel(plan.workTypeName, 'Работа')}
                  </Badge>
                  <Badge className={statusBadgeClass(plan.status)}>
                    {STATUS_LABELS[plan.status]}
                  </Badge>
                </div>
                <p className="font-medium text-foreground">{planFieldsLabel(plan)}</p>
                {plan.fieldNames.length > 1 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {plan.fieldNames.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs font-normal">
                        {humanLabel(name, 'Поле')}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">
                  {joinLabels([plan.equipmentName, plan.implementName])}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {humanLabel(plan.employeeName, 'Сотрудник не назначен')}
                </p>
                {plan.notes ? (
                  <p className="mt-1 truncate text-sm text-muted-foreground">{plan.notes}</p>
                ) : null}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
