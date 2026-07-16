import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useEquipment } from '@/features/worktime/referenceHooks'

interface ExpensesFiltersProps {
  from?: string
  to?: string
  category?: string
  equipmentId?: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCategoryChange: (category: string | undefined) => void
  onEquipmentChange: (equipmentId: string | undefined) => void
}

export function ExpensesFilters({
  from,
  to,
  category,
  equipmentId,
  onRangeChange,
  onCategoryChange,
  onEquipmentChange,
}: ExpensesFiltersProps) {
  const { data: equipment = [] } = useEquipment()
  const { data: categories = [] } = useDictionary('expense_category')
  const categoryItems = categories.map((row) => ({ value: row.code, label: row.name }))

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <DateRangePicker from={from} to={to} onChange={onRangeChange} />
      <Select
        value={category ?? 'all'}
        onValueChange={(value) =>
          onCategoryChange(!value || value === 'all' ? undefined : value)
        }
        items={[
          { value: 'all', label: 'Все категории' },
          ...categoryItems,
        ]}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Все категории" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все категории</SelectItem>
          {categoryItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={equipmentId ?? 'all'}
        onValueChange={(value) =>
          onEquipmentChange(!value || value === 'all' ? undefined : value)
        }
        items={[
          { value: 'all', label: 'Вся техника' },
          ...equipment.map((item) => ({ value: item.id, label: item.name })),
        ]}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Вся техника" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Вся техника</SelectItem>
          {equipment.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
