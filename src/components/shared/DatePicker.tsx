import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatIsoDate, parseIsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  value?: string
  onChange: (iso: string | undefined) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  /** Block selecting calendar days after today (local). */
  disableFuture?: boolean
}

/** Single-day picker. Value contract: ISO `yyyy-MM-dd` (API / native date input). */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Выберите дату',
  id,
  className,
  disabled,
  disableFuture = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseIsoDate(value) : undefined

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
          {selected ? format(selected, 'dd MMMM yyyy', { locale: ru }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ru}
          selected={selected}
          onSelect={(date) => {
            onChange(date ? formatIsoDate(date) : undefined)
            setOpen(false)
          }}
          defaultMonth={selected}
          disabled={disableFuture ? { after: new Date() } : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}
