import { DateRangePicker } from '@/components/shared/DateRangePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CROP_TYPES } from '@/features/shipments/utils'

interface ShipmentsFiltersProps {
  from?: string
  to?: string
  cropType?: string
  onRangeChange: (range: { from?: string; to?: string }) => void
  onCropChange: (cropType: string | undefined) => void
}

export function ShipmentsFilters({
  from,
  to,
  cropType,
  onRangeChange,
  onCropChange,
}: ShipmentsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <DateRangePicker from={from} to={to} onChange={onRangeChange} />
      <Select
        value={cropType ?? 'all'}
        onValueChange={(value) => onCropChange(!value || value === 'all' ? undefined : value)}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Все культуры" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все культуры</SelectItem>
          {CROP_TYPES.map((crop) => (
            <SelectItem key={crop} value={crop}>
              {crop}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
