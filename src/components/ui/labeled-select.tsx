import { cn } from '@/lib/utils'
import type { SelectOption } from '@/lib/selectOptions'
import { Label } from './label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

type LabeledSelectProps = {
  value?: string | null
  onValueChange: (value: string | null) => void
  options: SelectOption[]
  label?: string
  hint?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  'aria-invalid'?: boolean
}

/** Select that always shows labels (not raw ids/values) via Base UI `items`. */
export function LabeledSelect({
  value,
  onValueChange,
  options,
  label,
  hint,
  placeholder,
  disabled,
  className,
  'aria-invalid': ariaInvalid,
}: LabeledSelectProps) {
  const select = (
    <Select
      value={value || null}
      onValueChange={onValueChange}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-full', className)} aria-invalid={ariaInvalid}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!label) return select

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {select}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
