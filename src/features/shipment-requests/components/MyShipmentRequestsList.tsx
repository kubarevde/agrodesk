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
}

/** Card list for executors — same layout on phone and desktop (no table). */
export function MyShipmentRequestsList({ rows, busyId, onStart, onComplete }: Props) {
  return (
    <ul className="space-y-3" data-layout="cards">
      {rows.map((row) => {
        const overdue = isOverdue(row)
        const urgent = isUrgent(row)
        const showStart = canStartRequest(row)
        const showComplete = canCompleteRequest(row)
        return (
          <li
            key={row.id}
            className={cn(
              'rounded-xl border border-border bg-surface p-4',
              urgent && 'border-destructive/40 bg-destructive/5',
              overdue && !urgent && 'border-amber-600/40 bg-amber-500/5',
            )}
            data-testid={`my-shipment-row-${row.id}`}
            data-status={row.status}
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
            {urgent ? (
              <p className="mt-1 text-xs font-medium text-destructive">
                {PRIORITY_LABELS.urgent}
              </p>
            ) : null}
            {(showStart || showComplete) && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {showStart ? (
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    variant="outline"
                    disabled={busyId === row.id}
                    onClick={() => onStart(row.id)}
                  >
                    Взять в работу
                  </Button>
                ) : null}
                {showComplete ? (
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={busyId === row.id}
                    onClick={() => onComplete(row)}
                  >
                    Выполнено
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
