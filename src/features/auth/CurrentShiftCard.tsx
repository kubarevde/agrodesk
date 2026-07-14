import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Shift } from '@/types'
import { formatShiftTime } from '@/features/worktime/utils'
import { useLiveShiftTimer } from '@/features/worktime/useLiveShiftTimer'

interface CurrentShiftCardProps {
  shift: Shift | null
  isLoading: boolean
  onStart: () => void
  onFinish: (shift: Shift) => void
}

export function CurrentShiftCard({
  shift,
  isLoading,
  onStart,
  onFinish,
}: CurrentShiftCardProps) {
  const timer = useLiveShiftTimer(shift?.startTime ?? '00:00:00', shift?.date, Boolean(shift))

  if (isLoading) {
    return (
      <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
    )
  }

  if (!shift) {
    return (
      <section className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <h2 className="text-lg font-semibold text-foreground">Моя текущая смена</h2>
        <p className="text-sm text-muted-foreground">Смена не открыта</p>
        <Button
          type="button"
          onClick={onStart}
          className="h-12 w-full bg-success text-base text-white hover:bg-success/90"
        >
          <Play className="size-5" />
          Начать смену
        </Button>
      </section>
    )
  }

  return (
    <section className="space-y-4 rounded-xl border border-success/30 bg-success/10 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Моя текущая смена</h2>
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <span className="size-2.5 rounded-full bg-success" aria-hidden />
          Смена идёт
        </p>
      </div>

      <p className="font-mono text-4xl font-semibold tracking-tight text-foreground tabular-nums">
        {timer}
      </p>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Объект</dt>
          <dd className="text-right font-medium text-foreground">{shift.location}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Тип работ</dt>
          <dd className="text-right font-medium text-foreground">{shift.workType}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Техника</dt>
          <dd className="text-right font-medium text-foreground">
            {shift.equipment || '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Начало</dt>
          <dd className="text-right font-medium text-foreground">
            {formatShiftTime(shift.startTime)}
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        onClick={() => onFinish(shift)}
        className="h-12 w-full bg-destructive text-base text-white hover:bg-destructive/90"
      >
        Завершить смену
      </Button>
    </section>
  )
}
