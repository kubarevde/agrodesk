import { useRef, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ShipmentRequest } from '../types'
import {
  canCompleteRequest,
  canStartRequest,
  formatPlannedAt,
  isOverdue,
  isUrgent,
  PRIORITY_LABELS,
} from '../labels'
import { ShipmentRequestKindBadge } from './ShipmentRequestKindBadge'
import { ShipmentRequestStatusBadge } from './ShipmentRequestStatusBadge'

type Props = {
  rows: ShipmentRequest[]
  busyId?: string | null
  onStart: (id: string) => void
  onComplete: (row: ShipmentRequest) => void
  onOpen: (row: ShipmentRequest) => void
}

/** Card list for executors — same layout on phone and desktop (no table). */
export function MyShipmentRequestsList({
  rows,
  busyId,
  onStart,
  onComplete,
  onOpen,
}: Props) {
  return (
    <ul className="space-y-3" data-layout="cards">
      {rows.map((row) => (
        <MyShipmentRequestCard
          key={row.id}
          row={row}
          busy={busyId === row.id}
          onStart={onStart}
          onComplete={onComplete}
          onOpen={onOpen}
        />
      ))}
    </ul>
  )
}

function MyShipmentRequestCard({
  row,
  busy,
  onStart,
  onComplete,
  onOpen,
}: {
  row: ShipmentRequest
  busy: boolean
  onStart: (id: string) => void
  onComplete: (row: ShipmentRequest) => void
  onOpen: (row: ShipmentRequest) => void
}) {
  const suppressNavRef = useRef(false)
  const overdue = isOverdue(row)
  const urgent = isUrgent(row)
  const showStart = canStartRequest(row)
  const showComplete = canCompleteRequest(row)

  const open = () => {
    if (suppressNavRef.current) return
    onOpen(row)
  }

  const stopCardNav = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  }

  return (
    <li
      className={cn(
        'cursor-pointer rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40',
        urgent && 'border-destructive/40 bg-destructive/5',
        overdue && !urgent && 'border-amber-600/40 bg-amber-500/5',
      )}
      data-testid={`my-shipment-row-${row.id}`}
      data-status={row.status}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ShipmentRequestStatusBadge status={row.status} overdue={overdue} />
          <ShipmentRequestKindBadge row={row} />
        </div>
        <p
          className={cn(
            'text-sm',
            overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
          )}
        >
          {formatPlannedAt(row.plannedAt)}
          {overdue ? ' · просрочено' : ''}
        </p>
      </div>
      <p className="mt-2 text-base font-medium text-foreground">
        {row.inventoryItemName ?? 'ТМЦ'}
      </p>
      <p className="text-sm text-foreground">
        {row.quantity.toLocaleString('ru-RU')} {row.inventoryItemUnit}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{row.customerName}</p>
      {row.comment ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {row.comment}
        </p>
      ) : null}
      {urgent ? (
        <p className="mt-1 text-xs font-medium text-destructive">{PRIORITY_LABELS.urgent}</p>
      ) : null}
      {(showStart || showComplete) && (
        <div
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onClick={stopCardNav}
          onKeyDown={stopCardNav}
        >
          {showStart ? (
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              variant="outline"
              disabled={busy}
              onClick={() => {
                suppressNavRef.current = true
                onStart(row.id)
                window.setTimeout(() => {
                  suppressNavRef.current = false
                }, 300)
              }}
            >
              Взять в работу
            </Button>
          ) : null}
          {showComplete ? (
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={busy}
              onClick={() => {
                suppressNavRef.current = true
                onComplete(row)
                window.setTimeout(() => {
                  suppressNavRef.current = false
                }, 300)
              }}
            >
              Выполнено
            </Button>
          ) : null}
        </div>
      )}
    </li>
  )
}
