import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FieldOption = { id: string; name: string }

type AgroCalendarMonthToolbarProps = {
  month: Date
  fieldId?: string
  fields: FieldOption[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onFieldChange: (fieldId: string | undefined) => void
}

export function AgroCalendarMonthToolbar({
  month,
  fieldId,
  fields,
  onPrevMonth,
  onNextMonth,
  onFieldChange,
}: AgroCalendarMonthToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-2 sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 sm:hidden"
          aria-label="Предыдущий месяц"
          onClick={onPrevMonth}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={onPrevMonth}
        >
          ← Предыдущий месяц
        </Button>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-foreground sm:min-w-36 sm:flex-none">
          {format(month, 'LLLL yyyy', { locale: ru })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11 shrink-0 sm:hidden"
          aria-label="Следующий месяц"
          onClick={onNextMonth}
        >
          <ChevronRight className="size-5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={onNextMonth}
        >
          Следующий месяц →
        </Button>
      </div>

      <Select
        value={fieldId ?? 'all'}
        onValueChange={(value) => onFieldChange(!value || value === 'all' ? undefined : value)}
        items={[
          { value: 'all', label: 'Все поля' },
          ...fields.map((field) => ({ value: field.id, label: field.name })),
        ]}
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Все поля" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все поля</SelectItem>
          {fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
