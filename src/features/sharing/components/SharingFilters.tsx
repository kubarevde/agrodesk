import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PriceFilter, SharingListingType } from '../types'

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
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        value={type ?? 'all'}
        onValueChange={(value) =>
          onTypeChange(!value || value === 'all' ? undefined : (value as SharingListingType))
        }
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="field">Поля</SelectItem>
          <SelectItem value="equipment">Техника</SelectItem>
          <SelectItem value="implement">Приспособления</SelectItem>
          <SelectItem value="parts">Прочее</SelectItem>
        </SelectContent>
      </Select>

      <Input
        className="w-full sm:w-52"
        placeholder="Регион"
        value={region}
        onChange={(event) => onRegionChange(event.target.value)}
      />

      <Select value={price} onValueChange={(value) => onPriceChange(value as PriceFilter)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Цена" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          <SelectItem value="priced">С ценой</SelectItem>
          <SelectItem value="negotiable">Договорная</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
