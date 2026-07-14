import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatApiDate, parseApiDate, SHIFT_TIME_SLOTS } from '@/features/worktime/utils'

interface ShiftDateTimeFieldProps {
  label: string
  date: string
  time: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  dateError?: string
  timeError?: string
}

export function ShiftDateTimeField({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  dateError,
  timeError,
}: ShiftDateTimeFieldProps) {
  const selectedDate = date ? parseApiDate(date) : undefined
  const dateLabel = selectedDate ? format(selectedDate, 'dd.MM.yyyy') : 'Выберите дату'

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Popover>
          <PopoverTrigger
            className={cn(
              'inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm font-normal',
              dateError && 'border-destructive',
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{dateLabel}</span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              locale={ru}
              selected={selectedDate}
              onSelect={(value) => value && onDateChange(formatApiDate(value))}
              defaultMonth={selectedDate}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={time}
          onValueChange={(value) => value && onTimeChange(value)}
          items={SHIFT_TIME_SLOTS.map((slot) => ({ value: slot, label: slot }))}
        >
          <SelectTrigger className={cn('w-full', timeError && 'border-destructive')} aria-invalid={Boolean(timeError)}>
            <SelectValue placeholder="Время" />
          </SelectTrigger>
          <SelectContent>
            {SHIFT_TIME_SLOTS.map((slot) => (
              <SelectItem key={slot} value={slot}>
                {slot}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {dateError ? <p className="text-xs text-destructive">{dateError}</p> : null}
      {!dateError && timeError ? <p className="text-xs text-destructive">{timeError}</p> : null}
    </div>
  )
}
