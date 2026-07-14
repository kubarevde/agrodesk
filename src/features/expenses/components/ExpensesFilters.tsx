import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from '@/features/expenses/utils'
import { useEquipment } from '@/features/worktime/referenceHooks'

interface ExpensesFiltersProps {
  from?: string
  to?: string
  category?: ExpenseCategory
  equipmentId?: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCategoryChange: (category: ExpenseCategory | undefined) => void
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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <DateRangePicker from={from} to={to} onChange={onRangeChange} />
      <Select
        value={category ?? 'all'}
        onValueChange={(value) =>
          onCategoryChange(!value || value === 'all' ? undefined : (value as ExpenseCategory))
        }
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Все категории" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все категории</SelectItem>
          {EXPENSE_CATEGORIES.map((item) => (
            <SelectItem key={item} value={item}>
              {CATEGORY_LABELS[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={equipmentId ?? 'all'}
        onValueChange={(value) =>
          onEquipmentChange(!value || value === 'all' ? undefined : value)
        }
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
