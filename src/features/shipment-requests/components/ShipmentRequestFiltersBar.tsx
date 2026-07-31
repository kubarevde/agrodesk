import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import type { InventoryItem } from '@/types'
import type { ShipmentRequestFilters, ShipmentRequestKind, ShipmentRequestStatus } from '../types'
import { STATUS_LABELS } from '../labels'

type Props = {
  filters: ShipmentRequestFilters
  onChange: (next: ShipmentRequestFilters) => void
  inventoryItems: InventoryItem[]
}

const STATUS_OPTIONS = selectOptions([
  { value: '', label: 'Все статусы' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
])

const KIND_OPTIONS = selectOptions([
  { value: '', label: 'Все типы' },
  { value: 'inventory', label: 'Заявки ТМЦ' },
  { value: 'harvest', label: 'Заявки на урожай' },
])

export function ShipmentRequestFiltersBar({ filters, onChange, inventoryItems }: Props) {
  const itemOptions = selectOptions([
    { value: '', label: 'Все позиции' },
    ...inventoryItems.map((item) => ({
      value: item.id,
      label: item.category === 'harvest' ? `${item.name} · урожай` : item.name,
    })),
  ])

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label>Статус</Label>
        <LabeledSelect
          value={filters.status ?? ''}
          onValueChange={(value) =>
            onChange({
              ...filters,
              status: (value || '') as ShipmentRequestStatus | '',
            })
          }
          options={STATUS_OPTIONS}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Тип заявки</Label>
        <LabeledSelect
          value={filters.kind ?? ''}
          onValueChange={(value) =>
            onChange({
              ...filters,
              kind: (value || '') as ShipmentRequestKind | '',
            })
          }
          options={KIND_OPTIONS}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Номенклатура</Label>
        <LabeledSelect
          value={filters.inventoryItemId ?? ''}
          onValueChange={(value) =>
            onChange({ ...filters, inventoryItemId: value || undefined })
          }
          options={itemOptions}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sr-filter-customer">Покупатель</Label>
        <Input
          id="sr-filter-customer"
          value={filters.customerName ?? ''}
          onChange={(e) =>
            onChange({ ...filters, customerName: e.target.value || undefined })
          }
          placeholder="Поиск…"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="sr-from">С</Label>
          <Input
            id="sr-from"
            type="date"
            value={filters.fromDate ?? ''}
            onChange={(e) =>
              onChange({ ...filters, fromDate: e.target.value || undefined })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sr-to">По</Label>
          <Input
            id="sr-to"
            type="date"
            value={filters.toDate ?? ''}
            onChange={(e) =>
              onChange({ ...filters, toDate: e.target.value || undefined })
            }
          />
        </div>
      </div>
    </div>
  )
}
