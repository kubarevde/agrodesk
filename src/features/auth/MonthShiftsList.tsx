import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Shift } from '@/types'
import {
  calcTotalHours,
  formatShiftTime,
  parseApiDate,
} from '@/features/worktime/utils'

interface MonthShiftsListProps {
  shifts: Shift[]
  hourlyRate: number
  onDetails: (shift: Shift) => void
}

function shiftHours(shift: Shift): number {
  if (shift.status === 'closed' && shift.durationRounded != null) {
    return shift.durationRounded
  }
  return 0
}

export function MonthShiftsList({ shifts, hourlyRate, onDetails }: MonthShiftsListProps) {
  const sorted = [...shifts].sort(
    (a, b) => parseApiDate(b.date).getTime() - parseApiDate(a.date).getTime(),
  )
  const totalHours = calcTotalHours(shifts.filter((shift) => shift.status === 'closed'))
  const earnings = Math.round(totalHours * hourlyRate)
  const monthLabel = format(new Date(), 'LLLL yyyy', { locale: ru })

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Мои смены за месяц</h2>

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          В этом месяце смен пока нет
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((shift) => (
            <article
              key={shift.id}
              className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-foreground">{shift.date}</p>
                <Badge
                  variant="outline"
                  className={
                    shift.status === 'open'
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-border bg-muted text-muted-foreground'
                  }
                >
                  {shift.status === 'open' ? 'Открыта' : 'Закрыта'}
                </Badge>
              </div>
              <p className="text-sm text-foreground">
                {shift.location} / {shift.workType}
              </p>
              <p className="text-sm text-muted-foreground">
                Время: {formatShiftTime(shift.startTime)} →{' '}
                {shift.endTime ? formatShiftTime(shift.endTime) : '…'} | Итого:{' '}
                {shift.status === 'closed' ? `${shiftHours(shift)} ч` : '—'}
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={() => onDetails(shift)}
              >
                Детали
              </Button>
            </article>
          ))}
        </div>
      )}

      <p className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-foreground">
        Итого за {monthLabel}: {sorted.length} смен / {totalHours} часов / ~
        {earnings.toLocaleString('ru-RU')} ₽
      </p>
    </section>
  )
}
