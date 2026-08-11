import { useMemo } from 'react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCropVarieties } from '@/features/dictionaries/cropVarietyHooks'
import { useDictionary } from '@/features/dictionaries/hooks'

interface ShipmentsFiltersProps {
  from?: string
  to?: string
  cropType?: string
  varietyId?: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCropChange: (cropType: string | undefined) => void
  onVarietyChange: (varietyId: string | undefined) => void
  /** Hide crop select on the TMC tab. */
  hideCrop?: boolean
}

export function ShipmentsFilters({
  from,
  to,
  cropType,
  varietyId,
  onRangeChange,
  onCropChange,
  onVarietyChange,
  hideCrop = false,
}: ShipmentsFiltersProps) {
  const { data: crops = [] } = useDictionary('crop')
  const cropNames = crops.map((crop) => crop.name)
  const selectedCropCode = useMemo(() => {
    if (!cropType) return ''
    return crops.find((crop) => crop.name === cropType)?.code ?? ''
  }, [cropType, crops])

  const { data: varieties = [], isLoading: varietiesLoading } = useCropVarieties(
    selectedCropCode || null,
    { activeOnly: true, enabled: Boolean(selectedCropCode) },
  )
  const showVarietyFilter = Boolean(selectedCropCode) && (varietiesLoading || varieties.length > 0)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <DateRangePicker from={from} to={to} onChange={onRangeChange} />
      {hideCrop ? null : (
        <>
          <Select
            value={cropType ?? 'all'}
            onValueChange={(value) => {
              onCropChange(!value || value === 'all' ? undefined : value)
              onVarietyChange(undefined)
            }}
            items={[
              { value: 'all', label: 'Все культуры' },
              ...cropNames.map((crop) => ({ value: crop, label: crop })),
            ]}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Все культуры" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все культуры</SelectItem>
              {cropNames.map((crop) => (
                <SelectItem key={crop} value={crop}>
                  {crop}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showVarietyFilter ? (
            <Select
              key={`variety-${selectedCropCode}`}
              value={varietyId ?? 'all'}
              onValueChange={(value) => {
                const next = typeof value === 'string' ? value : ''
                onVarietyChange(!next || next === 'all' ? undefined : next)
              }}
              disabled={varietiesLoading}
              items={[
                { value: 'all', label: 'Все сорта' },
                ...varieties.map((row) => ({ value: row.id, label: row.name })),
              ]}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder={varietiesLoading ? 'Загрузка…' : 'Все сорта'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сорта</SelectItem>
                {varieties.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </>
      )}
    </div>
  )
}
