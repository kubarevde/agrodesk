import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type MonthPickerProps = {
  /** ISO month `yyyy-MM`. */
  value?: string
  onChange: (ym: string | undefined) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
}

function parseMonth(ym: string | undefined): Date | undefined {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return undefined
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Month selector using project Calendar (value: `yyyy-MM`). */
export function MonthPicker({
  value,
  onChange,
  placeholder = 'Выберите месяц',
  id,
  className,
  disabled,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseMonth(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          'inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate">
          {selected ? format(selected, 'LLLL yyyy', { locale: ru }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ru}
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) {
              onChange(undefined)
              return
            }
            onChange(toYearMonth(date))
            setOpen(false)
          }}
          onMonthChange={(date) => {
            onChange(toYearMonth(date))
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
