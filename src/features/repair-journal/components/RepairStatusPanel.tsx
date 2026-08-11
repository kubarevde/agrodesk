import { DatePicker } from '@/components/shared/DatePicker'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import {
  CLOSED_REPAIR_STATUSES,
  isWaitingPartsStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
  WAITING_PARTS_STATUS,
} from '../lib/labels'
import type { RepairPriority, RepairStatus } from '../types'

type StatusDictItem = { code: string; name: string }

type RepairStatusPanelProps = {
  status: string
  waitingParts: boolean
  priority: RepairPriority | string
  statusDict: StatusDictItem[]
  returnDate: string
  createExpense: boolean
  hasChanges: boolean
  savePending?: boolean
  onStatusChange: (status: RepairStatus) => void
  onWaitingPartsChange: (waiting: boolean) => void
  onPriorityChange: (priority: RepairPriority) => void
  onReturnDateChange: (date: string) => void
  onCreateExpenseChange: (value: boolean) => void
  onSave: () => void
  onComplete: () => void
}

const FALLBACK_STATUSES = [
  { code: 'in_progress', name: STATUS_LABELS.in_progress },
  { code: WAITING_PARTS_STATUS, name: STATUS_LABELS.waiting_parts },
  { code: 'done', name: STATUS_LABELS.done },
  { code: 'cancelled', name: STATUS_LABELS.cancelled },
]

const PRIORITY_OPTIONS = selectOptions([
  { value: 'urgent', label: PRIORITY_LABELS.urgent },
  { value: 'normal', label: PRIORITY_LABELS.normal },
  { value: 'low', label: PRIORITY_LABELS.low },
])

export function RepairStatusPanel({
  status,
  waitingParts,
  priority,
  statusDict,
  returnDate,
  createExpense,
  hasChanges,
  savePending = false,
  onStatusChange,
  onWaitingPartsChange,
  onPriorityChange,
  onReturnDateChange,
  onCreateExpenseChange,
  onSave,
  onComplete,
}: RepairStatusPanelProps) {
  const source = statusDict.length > 0 ? statusDict : FALLBACK_STATUSES
  const statusOptions = selectOptions(
    source.map((item) => ({ value: item.code, label: item.name })),
  )
  const isClosed = CLOSED_REPAIR_STATUSES.has(status)
  const showExtraWaitingFlag = status === 'in_progress' || status === 'open'
  const showPrioritySelect = !(status === 'done' && !waitingParts)

  return (
    <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-2.5">
      <h3 className="text-sm font-medium">Статус и завершение</h3>
      <LabeledSelect
        label="Статус ремонта"
        value={status}
        options={statusOptions}
        onValueChange={(v) => {
          if (v) onStatusChange(v as RepairStatus)
        }}
      />
      <ManageInSettingsLink tab="repair-statuses" tabHint="статусы ремонта" />
      {showPrioritySelect ? (
        <LabeledSelect
          label="Приоритет"
          value={priority}
          options={PRIORITY_OPTIONS}
          onValueChange={(v) => {
            if (v) onPriorityChange(v as RepairPriority)
          }}
        />
      ) : null}
      {showExtraWaitingFlag ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={waitingParts}
            onChange={(e) => onWaitingPartsChange(e.target.checked)}
          />
          Также ожидает запчасти
        </label>
      ) : null}
      {isWaitingPartsStatus(status) ? (
        <p className="text-xs text-muted-foreground">
          Техника не в ремонте — только ожидание запчастей.
        </p>
      ) : null}

      {!isClosed || hasChanges ? (
        <div className="space-y-1">
          <Label htmlFor="return-date">Дата возврата в строй</Label>
          <DatePicker
            id="return-date"
            value={returnDate}
            onChange={(next) => {
              if (next) onReturnDateChange(next)
            }}
          />
        </div>
      ) : null}

      {!isClosed ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={createExpense}
            onChange={(e) => onCreateExpenseChange(e.target.checked)}
          />
          Создать затрату по сумме чек-листа (если ещё нет)
        </label>
      ) : null}

      <div className="flex flex-col gap-2">
        {hasChanges ? (
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-11"
            disabled={savePending}
            onClick={onSave}
          >
            {savePending ? 'Сохранение…' : 'Сохранить изменения'}
          </Button>
        ) : null}
        {!isClosed ? (
          <Button
            type="button"
            className="w-full min-h-11"
            disabled={savePending}
            onClick={onComplete}
          >
            Вернуть в строй
          </Button>
        ) : null}
      </div>

      {status === 'done' && !hasChanges ? (
        <p className="text-xs text-muted-foreground">Ремонт завершён.</p>
      ) : null}
    </div>
  )
}
