import { useRef, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Shift } from '@/types'

interface ShiftsCardListProps {
  shifts: Shift[]
  onDetails: (shift: Shift) => void
  onDelete?: (shift: Shift) => void
}

export function ShiftsCardList({ shifts, onDetails, onDelete }: ShiftsCardListProps) {
  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          onDetails={onDetails}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function ShiftCard({
  shift,
  onDetails,
  onDelete,
}: {
  shift: Shift
  onDetails: (shift: Shift) => void
  onDelete?: (shift: Shift) => void
}) {
  const suppressNavRef = useRef(false)

  const openDetails = () => {
    if (suppressNavRef.current) return
    onDetails(shift)
  }

  const stopCardNav = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openDetails()
    }
  }

  return (
    <article
      className="cursor-pointer rounded-lg border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary/40"
      data-testid={`shift-card-${shift.id}`}
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={onKeyDown}
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
      {onDelete ? (
        <div className="mt-3" onClick={stopCardNav} onKeyDown={stopCardNav}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-destructive"
            onClick={() => {
              suppressNavRef.current = true
              onDelete(shift)
              window.setTimeout(() => {
                suppressNavRef.current = false
              }, 300)
            }}
          >
            Удалить
          </Button>
        </div>
      ) : null}
    </article>
  )
}
