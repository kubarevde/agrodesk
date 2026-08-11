import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Clock } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SHIFT_TIME_SLOTS } from '@/features/worktime/utils'
import { formatIsoDate, parseIsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

type DateTimePickerProps = {
  value?: string
  onChange: (local: string) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

function splitLocal(value?: string): { date: string; time: string } {
  if (!value) return { date: '', time: '09:00' }
  const [datePart, timePart = '09:00'] = value.split('T')
  return { date: datePart ?? '', time: timePart.slice(0, 5) || '09:00' }
}

/**
 * Date + time picker. Value contract matches `datetime-local`: `yyyy-MM-ddTHH:mm`.
 * Time uses the same styled Select as shift forms (30-minute slots).
 */
export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Выберите дату',
  id,
  className,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const { date, time } = splitLocal(value)
  const selected = date ? parseIsoDate(date) : undefined

  const timeItems = useMemo(() => {
    const slots = SHIFT_TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))
    if (time && !SHIFT_TIME_SLOTS.includes(time)) {
      return [{ value: time, label: time }, ...slots]
    }
    return slots
  }, [time])

  const emit = (nextDate: string, nextTime: string) => {
    if (!nextDate) {
      onChange('')
      return
    }
    onChange(`${nextDate}T${nextTime || '09:00'}`)
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          className="inline-flex h-9 min-h-11 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9"
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
            onSelect={(picked) => {
              if (!picked) {
                emit('', time)
                return
              }
              emit(formatIsoDate(picked), time)
              setOpen(false)
            }}
            defaultMonth={selected}
          />
        </PopoverContent>
      </Popover>

      <Select
        value={time}
        onValueChange={(next) => {
          if (!next || !date) return
          emit(date, next)
        }}
        items={timeItems}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 min-h-11 w-full sm:min-h-9" aria-label="Время">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Время" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {timeItems.map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
