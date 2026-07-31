import { cn } from '@/lib/utils'
import { resolveDictionaryLabel } from '@/features/dictionaries/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  formatMoney,
  formatPlannedAt,
  isOverdue,
  isUrgent,
  PRIORITY_LABELS,
} from '../labels'
import { categoryColumnLabel } from '../itemSelect'
import { ShipmentRequestActions } from './ShipmentRequestActions'
import { ShipmentRequestKindBadge } from './ShipmentRequestKindBadge'
import { ShipmentRequestStatusBadge } from './ShipmentRequestStatusBadge'
import { rowTone, type ShipmentRequestsViewProps } from './ShipmentRequestsViews.types'

export function ShipmentRequestsCards({
  rows,
  canManage,
  onStart,
  onComplete,
  onCancel,
  onAssign,
  busyId,
}: ShipmentRequestsViewProps) {
  const { data: crops = [] } = useDictionary('crop')
  return (
    <ul className="space-y-3 md:hidden" data-layout="cards">
      {rows.map((row) => {
        const overdue = isOverdue(row)
        const urgent = isUrgent(row)
        const cropName = row.cropCode
          ? resolveDictionaryLabel(row.cropCode, crops)
          : ''
        return (
          <li
            key={row.id}
            className={cn(
              'rounded-xl border border-border bg-surface p-4',
              urgent && 'border-destructive/40',
              overdue && !urgent && 'border-amber-600/40',
              rowTone(row),
            )}
            data-testid={`shipment-request-row-${row.id}`}
            data-status={row.status}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ShipmentRequestStatusBadge status={row.status} overdue={overdue} />
                <ShipmentRequestKindBadge row={row} />
              </div>
              {urgent ? (
                <p className="text-xs font-medium text-destructive">{PRIORITY_LABELS.urgent}</p>
              ) : null}
            </div>
            <p className="mt-2 font-medium text-foreground">{row.inventoryItemName ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {categoryColumnLabel(row.inventoryItemCategory, row.isHarvest)}
              {cropName ? ` · ${cropName}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">{row.customerName}</p>
            <p className="mt-1 text-sm text-foreground">
              {row.quantity.toLocaleString('ru-RU')} {row.inventoryItemUnit} ·{' '}
              {formatMoney(row.price)}
            </p>
            <p
              className={cn(
                'mt-1 text-sm',
                overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
              )}
            >
              {formatPlannedAt(row.plannedAt)}
              {overdue ? ' · просрочено' : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Исполнитель: {row.assignedToName ?? 'Не назначен'}
            </p>
            <div className="mt-3">
              <ShipmentRequestActions
                row={row}
                canManage={canManage}
                busy={busyId === row.id}
                touchFriendly
                onStart={onStart}
                onComplete={onComplete}
                onCancel={onCancel}
                onAssign={onAssign}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
