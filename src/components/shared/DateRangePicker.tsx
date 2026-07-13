import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'

interface DateRangePickerProps {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
  className?: string
}

function toDateRange(from?: string, to?: string): DateRange | undefined {
  if (!from) return undefined
  return {
    from: parseApiDate(from),
    to: to ? parseApiDate(to) : undefined,
  }
}

export function DateRangePicker({ from, to, onChange, className }: DateRangePickerProps) {
  const selected = toDateRange(from, to)

  const handleSelect = (range: DateRange | undefined) => {
    onChange({
      from: range?.from ? formatApiDate(range.from) : undefined,
      to: range?.to ? formatApiDate(range.to) : undefined,
    })
  }

  const label =
    selected?.from && selected?.to
      ? `${format(selected.from, 'dd.MM.yyyy')} — ${format(selected.to, 'dd.MM.yyyy')}`
      : selected?.from
        ? format(selected.from, 'dd.MM.yyyy')
        : 'Выберите период'

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'inline-flex h-8 items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal whitespace-nowrap',
          className,
        )}
      >
        <CalendarIcon className="size-4 text-muted-foreground" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          locale={ru}
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
          defaultMonth={selected?.from}
        />
      </PopoverContent>
    </Popover>
  )
}
