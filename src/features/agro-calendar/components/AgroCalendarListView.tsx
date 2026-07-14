import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFields } from '@/features/fields/hooks'
import { useAgroPlans } from '../hooks'
import type { AgroPlan, AgroPlanStatus } from '../types'
import { STATUS_LABELS } from '../types'
import { displayFromIsoDate, isoFromDisplayDate, statusBadgeClass } from '../utils'

type AgroCalendarListViewProps = {
  fieldId?: string
  status?: AgroPlanStatus
  from?: string
  to?: string
  onFieldChange: (fieldId: string | undefined) => void
  onStatusChange: (status: AgroPlanStatus | undefined) => void
  onRangeChange: (range: { from?: string; to?: string }) => void
  onSelectPlan: (plan: AgroPlan) => void
  onAddPlan?: () => void
}

export function AgroCalendarListView({
  fieldId,
  status,
  from,
  to,
  onFieldChange,
  onStatusChange,
  onRangeChange,
  onSelectPlan,
  onAddPlan,
}: AgroCalendarListViewProps) {
  const { data: plans = [], isLoading } = useAgroPlans({ fieldId })
  const { data: fields = [] } = useFields()

  const filtered = useMemo(() => {
    return plans.filter((plan) => {
      if (status && plan.status !== status) return false
      if (from && plan.plannedDate < isoFromDisplayDate(from)) return false
      if (to && plan.plannedDate > isoFromDisplayDate(to)) return false
      return true
    })
  }, [from, plans, status, to])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Select
          value={fieldId ?? 'all'}
          onValueChange={(value) => onFieldChange(!value || value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Поле" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все поля</SelectItem>
            {fields.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status ?? 'all'}
          onValueChange={(value) =>
            onStatusChange(!value || value === 'all' ? undefined : (value as AgroPlanStatus))
          }
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker from={from} to={to} onChange={onRangeChange} />
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Нет запланированных работ"
          description="Создайте план на поле, чтобы видеть его в календаре и списке."
          action={onAddPlan ? { label: 'Запланировать работу', onClick: onAddPlan } : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Поле</TableHead>
                <TableHead>Тип работы</TableHead>
                <TableHead>Техника + Приспособление</TableHead>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((plan) => (
                <TableRow
                  key={plan.id}
                  className="cursor-pointer"
                  onClick={() => onSelectPlan(plan)}
                >
                  <TableCell>{displayFromIsoDate(plan.plannedDate)}</TableCell>
                  <TableCell>{plan.fieldName}</TableCell>
                  <TableCell>{plan.workTypeName}</TableCell>
                  <TableCell>
                    {[plan.equipmentName, plan.implementName].filter(Boolean).join(' + ') || '—'}
                  </TableCell>
                  <TableCell>{plan.employeeName || '—'}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(plan.status)}>
                      {STATUS_LABELS[plan.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
