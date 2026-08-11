import { useMemo } from 'react'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import { regionLabel, ruRegionSelectOptions } from '@/lib/regions.ru'

const EMPTY = { value: '', label: 'Не указан' }

type RegionSelectProps = {
  value?: string | null
  onValueChange: (code: string | null) => void
  label?: string
  placeholder?: string
  /** Include empty «Не указан» / «Все регионы» option */
  emptyLabel?: string
  /** When false, only catalog codes (no empty row). Default true. */
  includeEmpty?: boolean
  className?: string
  disabled?: boolean
}

export function RegionSelect({
  value,
  onValueChange,
  label,
  placeholder = 'Выберите регион',
  emptyLabel = 'Не указан',
  includeEmpty = true,
  className,
  disabled,
}: RegionSelectProps) {
  const options = useMemo(() => {
    const base = selectOptions(
      includeEmpty
        ? ruRegionSelectOptions({ value: '', label: emptyLabel })
        : ruRegionSelectOptions(),
    )
    if (!value || base.some((row) => row.value === value)) return base
    return selectOptions([...base, { value, label: regionLabel(value) }])
  }, [emptyLabel, includeEmpty, value])

  return (
    <LabeledSelect
      label={label}
      className={className}
      value={value ?? ''}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      onValueChange={(next) => onValueChange(next ? next : null)}
    />
  )
}

export { EMPTY as REGION_SELECT_EMPTY }
