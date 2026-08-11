import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/shared/DatePicker'
import { useCreatePayrollRun } from '../hooks'
import type { PayrollRun } from '../types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: PayrollRun[]
  onCreated: (runId: string) => void
}

function monthBounds(ym: string): { start: string; end: string } {
  const [y, m] = ym.split('-').map(Number)
  const start = `${ym}-01`
  const last = new Date(y, m, 0).getDate()
  const end = `${ym}-${String(last).padStart(2, '0')}`
  return { start, end }
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && aEnd >= bStart
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function CreatePayrollRunDialog({
  open,
  onOpenChange,
  existing,
  onCreated,
}: Props) {
  const create = useCreatePayrollRun()
  const defaults = useMemo(() => monthBounds(currentMonth()), [])
  const [start, setStart] = useState(defaults.start)
  const [end, setEnd] = useState(defaults.end)

  const conflict = useMemo(
    () => existing.some((r) => overlaps(start, end, r.periodStart, r.periodEnd)),
    [existing, start, end],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать начисление</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Начало периода</Label>
            <DatePicker value={start} onChange={(v) => v && setStart(v)} />
          </div>
          <div className="space-y-1">
            <Label>Конец периода</Label>
            <DatePicker value={end} onChange={(v) => v && setEnd(v)} />
          </div>
          {conflict && (
            <p className="text-sm text-destructive">
              Период пересекается с существующим начислением — сервер отклонит создание.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={create.isPending || !start || !end || end < start}
            onClick={() => {
              create.mutate(
                { periodStart: start, periodEnd: end },
                { onSuccess: (run) => onCreated(run.id) },
              )
            }}
          >
            Создать черновик
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
