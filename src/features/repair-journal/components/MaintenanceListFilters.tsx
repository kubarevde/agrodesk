import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'

type MaintenanceListFiltersProps = {
  status: string
  waitingFilter: string
  statusOptions: Array<{ value: string; label: string }>
  onStatusChange: (value: string) => void
  onWaitingChange: (value: string) => void
}

const WAITING_OPTIONS = selectOptions([
  { value: 'all', label: 'Все' },
  { value: 'yes', label: 'Ожидает запчасти' },
  { value: 'no', label: 'Не ждёт запчасти' },
])

export function MaintenanceListFilters({
  status,
  waitingFilter,
  statusOptions,
  onStatusChange,
  onWaitingChange,
}: MaintenanceListFiltersProps) {
  const statusSelectOptions = selectOptions(statusOptions)

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2 sm:p-4">
      <div className="space-y-1.5">
        <Label>Статус</Label>
        <LabeledSelect
          className="min-h-11 w-full"
          value={status}
          options={statusSelectOptions}
          onValueChange={(v) => onStatusChange(v || 'all')}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Запчасти</Label>
        <LabeledSelect
          className="min-h-11 w-full"
          value={waitingFilter}
          options={WAITING_OPTIONS}
          onValueChange={(v) => onWaitingChange(v || 'all')}
        />
      </div>
    </div>
  )
}
