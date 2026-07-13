import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Shift } from '@/types'

interface ShiftsCardListProps {
  shifts: Shift[]
  onDetails: (shift: Shift) => void
}

export function ShiftsCardList({ shifts, onDetails }: ShiftsCardListProps) {
  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <article
          key={shift.id}
          className="rounded-lg border border-border bg-surface p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-foreground">{shift.employeeName}</p>
              <p className="text-sm text-muted-foreground">{shift.location}</p>
              <p className="text-sm text-muted-foreground">{shift.date}</p>
            </div>
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => onDetails(shift)}
          >
            Детали
          </Button>
        </article>
      ))}
    </div>
  )
}
