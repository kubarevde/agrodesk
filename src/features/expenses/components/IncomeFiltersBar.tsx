import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  INCOME_FILTER_HARVEST,
  INCOME_FILTER_TMC,
  INCOME_SOURCE_LABELS,
} from '../incomeUtils'

interface IncomeFiltersBarProps {
  from?: string
  to?: string
  category?: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCategoryChange: (category: string | undefined) => void
}

/**
 * Period + categories: dictionary income_category (manual form) and
 * auto sources from shipments (harvest / TMC).
 */
export function IncomeFiltersBar({
  from,
  to,
  category,
  onRangeChange,
  onCategoryChange,
}: IncomeFiltersBarProps) {
  const { data: categories = [] } = useDictionary('income_category')
  const categoryItems = [
    {
      value: INCOME_FILTER_HARVEST,
      label: INCOME_SOURCE_LABELS.harvest_shipment,
    },
    {
      value: INCOME_FILTER_TMC,
      label: INCOME_SOURCE_LABELS.tmc_shipment,
    },
    ...categories.map((row) => ({ value: row.code, label: row.name })),
  ]

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
        <SelectTrigger className="w-full sm:w-56" aria-label="Категория дохода">
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
    </div>
  )
}
