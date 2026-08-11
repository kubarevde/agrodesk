import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { displayDateToIso, isoDateToDisplay } from '@/lib/transformers'
import { cn } from '@/lib/utils'

export type PeriodPreset =
  | 'current_month'
  | 'prev_month'
  | 'last_3_months'
  | 'current_year'
  | 'custom'

export type PeriodRange = { fromIso: string; toIso: string }

type Props = {
  preset: PeriodPreset
  fromIso: string
  toIso: string
  onChange: (next: { preset: PeriodPreset; fromIso: string; toIso: string }) => void
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'current_month', label: 'Текущий месяц' },
  { value: 'prev_month', label: 'Предыдущий месяц' },
  { value: 'last_3_months', label: 'Последние 3 месяца' },
  { value: 'current_year', label: 'Текущий год' },
  { value: 'custom', label: 'Произвольный' },
]

export function defaultControlPeriod(): PeriodRange & { preset: PeriodPreset } {
  const now = new Date()
  return {
    preset: 'current_month',
    fromIso: format(startOfMonth(now), 'yyyy-MM-dd'),
    toIso: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function rangeForPreset(preset: PeriodPreset, now = new Date()): PeriodRange {
  if (preset === 'prev_month') {
    const prev = subMonths(now, 1)
    return {
      fromIso: format(startOfMonth(prev), 'yyyy-MM-dd'),
      toIso: format(endOfMonth(prev), 'yyyy-MM-dd'),
    }
  }
  if (preset === 'last_3_months') {
    return {
      fromIso: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),
      toIso: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }
  if (preset === 'current_year') {
    return {
      fromIso: format(startOfYear(now), 'yyyy-MM-dd'),
      toIso: format(endOfYear(now), 'yyyy-MM-dd'),
    }
  }
  return {
    fromIso: format(startOfMonth(now), 'yyyy-MM-dd'),
    toIso: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function PayrollControlPeriodFilter({ preset, fromIso, toIso, onChange }: Props) {
  return (
    <div className="min-w-0 space-y-3 overflow-x-hidden">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={preset === p.value ? 'default' : 'outline'}
            className={cn(
              'min-h-11 whitespace-normal px-2 text-xs sm:min-h-8 sm:text-sm',
              preset === p.value && 'bg-primary hover:bg-primary-hover',
            )}
            onClick={() => {
              if (p.value === 'custom') {
                onChange({ preset: 'custom', fromIso, toIso })
                return
              }
              const range = rangeForPreset(p.value)
              onChange({ preset: p.value, ...range })
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === 'custom' ? (
        <DateRangePicker
          from={isoDateToDisplay(fromIso)}
          to={isoDateToDisplay(toIso)}
          onChange={(range) => {
            if (!range.from || !range.to) return
            onChange({
              preset: 'custom',
              fromIso: displayDateToIso(range.from),
              toIso: displayDateToIso(range.to),
            })
          }}
        />
      ) : null}
    </div>
  )
}
