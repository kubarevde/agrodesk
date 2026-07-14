import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import type { PriceFilter, SharingListingType } from '../types'

const TYPE_OPTIONS = selectOptions([
  { value: 'all', label: 'Все' },
  { value: 'field', label: 'Поля' },
  { value: 'equipment', label: 'Техника' },
  { value: 'implement', label: 'Приспособления' },
  { value: 'parts', label: 'Прочее' },
])

const PRICE_OPTIONS = selectOptions([
  { value: 'all', label: 'Все' },
  { value: 'priced', label: 'С ценой' },
  { value: 'negotiable', label: 'Договорная' },
])

type SharingFiltersProps = {
  type?: SharingListingType
  region: string
  price: PriceFilter
  onTypeChange: (type: SharingListingType | undefined) => void
  onRegionChange: (region: string) => void
  onPriceChange: (price: PriceFilter) => void
}

export function SharingFilters({
  type,
  region,
  price,
  onTypeChange,
  onRegionChange,
  onPriceChange,
}: SharingFiltersProps) {
  const typeOptions = useMemo(() => TYPE_OPTIONS, [])
  const priceOptions = useMemo(() => PRICE_OPTIONS, [])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <LabeledSelect
        className="sm:w-48"
        value={type ?? 'all'}
        options={typeOptions}
        placeholder="Тип ресурса"
        onValueChange={(value) =>
          onTypeChange(!value || value === 'all' ? undefined : (value as SharingListingType))
        }
      />

      <Input
        className="w-full sm:w-52"
        placeholder="Регион"
        value={region}
        onChange={(event) => onRegionChange(event.target.value)}
      />

      <LabeledSelect
        className="sm:w-44"
        value={price}
        options={priceOptions}
        placeholder="Цена"
        onValueChange={(value) => onPriceChange((value as PriceFilter) || 'all')}
      />
    </div>
  )
}
