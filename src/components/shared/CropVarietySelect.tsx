import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCropVarieties } from '@/features/dictionaries/cropVarietyHooks'

type CropVarietySelectProps = {
  cropCode: string | null | undefined
  value: string | null | undefined
  onChange: (varietyId: string | null) => void
  disabled?: boolean
  label?: string
  /** When true, show even if crop has no varieties (empty hint). */
  showWhenEmpty?: boolean
}

/** Optional variety picker bound to a crop dictionary code. */
export function CropVarietySelect({
  cropCode,
  value,
  onChange,
  disabled,
  label = 'Сорт (необязательно)',
  showWhenEmpty = false,
}: CropVarietySelectProps) {
  const code = (cropCode ?? '').trim()
  const { data: varieties = [], isLoading } = useCropVarieties(code || null, {
    activeOnly: true,
    enabled: Boolean(code),
  })

  const items = useMemo(
    () => [
      { value: '__none__', label: 'Без сорта' },
      ...varieties.map((row) => ({ value: row.id, label: row.name })),
    ],
    [varieties],
  )

  if (!code) return null
  if (!showWhenEmpty && !isLoading && varieties.length === 0) return null

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value || '__none__'}
        onValueChange={(v) => onChange(!v || v === '__none__' ? null : v)}
        disabled={disabled || isLoading}
        items={items}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? 'Загрузка…' : 'Без сорта'} />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
