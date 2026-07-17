import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { selectOptions } from '@/lib/selectOptions'
import type { PurchasePlannerItem } from '../types'
import { PurchaseList } from './PurchaseList'

type PurchaseStatus = 'planned' | 'purchased' | 'cancelled'

const STATUS_OPTIONS = [
  { value: 'planned' as const, label: 'К покупке' },
  { value: 'purchased' as const, label: 'Закрыто' },
  { value: 'cancelled' as const, label: 'Отменено' },
]

type PurchaseManageViewProps = {
  items: PurchasePlannerItem[]
  status: PurchaseStatus
  onStatusChange: (status: PurchaseStatus) => void
  urgency: string
  onUrgencyChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  responsibleId: string
  onResponsibleChange: (value: string) => void
  urgencyOptions: ReturnType<typeof selectOptions>
  categoryOptions: ReturnType<typeof selectOptions>
  responsibleOptions: ReturnType<typeof selectOptions>
  onAdd: () => void
}

export function PurchaseManageView({
  items,
  status,
  onStatusChange,
  urgency,
  onUrgencyChange,
  category,
  onCategoryChange,
  responsibleId,
  onResponsibleChange,
  urgencyOptions,
  categoryOptions,
  responsibleOptions,
  onAdd,
}: PurchaseManageViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={status}
          onChange={onStatusChange}
          options={STATUS_OPTIONS}
          ariaLabel="Статус закупок"
          className="sm:max-w-sm"
        />
        <Button type="button" className="min-h-10 shrink-0" onClick={onAdd}>
          <Plus className="mr-1.5 size-4" />
          Добавить
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <LabeledSelect
            label="Срочность"
            value={urgency}
            options={urgencyOptions}
            onValueChange={(v) => onUrgencyChange(v || 'all')}
          />
          <LabeledSelect
            label="Категория"
            value={category}
            options={categoryOptions}
            onValueChange={(v) => onCategoryChange(v || 'all')}
          />
          <LabeledSelect
            label="Ответственный"
            value={responsibleId}
            options={responsibleOptions}
            onValueChange={(v) => onResponsibleChange(v || 'all')}
          />
        </div>

      <PurchaseList items={items} />
    </div>
  )
}
