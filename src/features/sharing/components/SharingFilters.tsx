import { useMemo } from 'react'
import { RegionSelect } from '@/components/shared/RegionSelect'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import { PRICE_UNITS, type SharingListingType, type SharingPriceFilter } from '../types'

const TYPE_OPTIONS = selectOptions([
  { value: 'all', label: 'Все типы' },
  { value: 'field', label: 'Поле' },
  { value: 'equipment', label: 'Техника' },
  { value: 'implement', label: 'Приспособления' },
])

const UNIT_OPTIONS = selectOptions([
  { value: 'all', label: 'Любая единица' },
  ...PRICE_UNITS.map((unit) => ({ value: unit, label: unit })),
])

type SharingFiltersProps = {
  type?: SharingListingType
  region: string
  price: SharingPriceFilter
  onTypeChange: (type: SharingListingType | undefined) => void
  onRegionChange: (region: string) => void
  onPriceChange: (price: SharingPriceFilter) => void
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
  const unitOptions = useMemo(() => UNIT_OPTIONS, [])
  const showRange = price.unit !== 'all' && price.unit !== 'договорная'

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <LabeledSelect
        className="w-full sm:w-48"
        value={type ?? 'all'}
        options={typeOptions}
        placeholder="Тип объявления"
        onValueChange={(value) =>
          onTypeChange(!value || value === 'all' ? undefined : (value as SharingListingType))
        }
      />

      <RegionSelect
        className="w-full sm:w-56"
        value={region || null}
        emptyLabel="Все регионы"
        placeholder="Регион"
        onValueChange={(code) => onRegionChange(code ?? '')}
      />

      <LabeledSelect
        className="w-full sm:w-44"
        value={price.unit}
        options={unitOptions}
        placeholder="Единица цены"
        onValueChange={(value) =>
          onPriceChange({
            unit: value || 'all',
            min: value === 'договорная' || !value || value === 'all' ? null : price.min,
            max: value === 'договорная' || !value || value === 'all' ? null : price.max,
          })
        }
      />

      {showRange ? (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
          <div className="space-y-1 sm:space-y-0">
            <Label htmlFor="sharing-price-min" className="text-xs text-muted-foreground sm:sr-only">
              Цена от
            </Label>
            <Input
              id="sharing-price-min"
              type="number"
              min={0}
              inputMode="decimal"
              className="min-h-11 sm:min-h-10 sm:w-28"
              placeholder="От"
              aria-label="Цена от"
              value={price.min ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                onPriceChange({
                  ...price,
                  min: raw === '' ? null : Number(raw),
                })
              }}
            />
          </div>
          <div className="space-y-1 sm:space-y-0">
            <Label htmlFor="sharing-price-max" className="text-xs text-muted-foreground sm:sr-only">
              до
            </Label>
            <Input
              id="sharing-price-max"
              type="number"
              min={0}
              inputMode="decimal"
              className="min-h-11 sm:min-h-10 sm:w-28"
              placeholder="До"
              aria-label="Цена до"
              value={price.max ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                onPriceChange({
                  ...price,
                  max: raw === '' ? null : Number(raw),
                })
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
