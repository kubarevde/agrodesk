import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActiveShiftLiveDuration } from '@/features/dashboard/components/ActiveShiftLiveDuration'
import { formatShiftTime } from '@/features/worktime/utils'
import type { Shift } from '@/types'

type Props = {
  shifts: Shift[]
  canCloseOthers?: boolean
  currentUserId?: string
  currentEmployeeCode?: string
  onCloseShift?: (shift: Shift) => void
}

function isOwn(
  shift: Shift,
  userId?: string,
  code?: string,
): boolean {
  if (userId && shift.employeeId === userId) return true
  return Boolean(code && shift.employeeCode === code)
}

/** Enriched open-shift cards for manager «Кто сейчас работает». */
export function ManagerActiveWorkersList({
  shifts,
  canCloseOthers = false,
  currentUserId,
  currentEmployeeCode,
  onCloseShift,
}: Props) {
  return (
    <div className="space-y-3">
      {shifts.map((shift) => {
        const own = isOwn(shift, currentUserId, currentEmployeeCode)
        const showClose = canCloseOthers && onCloseShift && !own
        return (
          <article
            key={shift.id}
            className="rounded-lg border border-border bg-surface p-4"
            data-testid={`active-worker-${shift.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-medium text-foreground">{shift.employeeName}</p>
              <Badge
                variant="outline"
                className="border-success/30 bg-success/10 text-success"
              >
                Открыта
              </Badge>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span>Объект</span>
              <span className="text-right text-foreground">{shift.location || '—'}</span>
              {shift.workType ? (
                <>
                  <span>Тип работ</span>
                  <span className="text-right text-foreground">{shift.workType}</span>
                </>
              ) : null}
              {shift.fieldName ? (
                <>
                  <span>Поле</span>
                  <span className="text-right text-foreground">{shift.fieldName}</span>
                </>
              ) : null}
              <span>Начало</span>
              <span className="text-right text-foreground">
                {formatShiftTime(shift.startTime)}
                {shift.date ? ` · ${shift.date}` : ''}
              </span>
              <span>Статус</span>
              <span className="text-right text-foreground">
                Идёт · <ActiveShiftLiveDuration shift={toLiveShift(shift)} />
              </span>
            </div>
            {showClose ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full text-destructive"
                onClick={() => onCloseShift(shift)}
              >
                Закрыть смену
              </Button>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function toLiveShift(shift: Shift) {
  return {
    id: shift.id,
    employeeName: shift.employeeName,
    location: shift.location,
    startTime: shift.startTime,
    date: shift.date,
    durationMinutes: shift.durationRounded ?? shift.durationRaw ?? 0,
  }
}
