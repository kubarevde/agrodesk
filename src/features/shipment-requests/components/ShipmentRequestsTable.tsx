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

export function ShipmentRequestsTable({
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
    <div
      className="hidden overflow-x-auto rounded-xl border border-border md:block"
      data-layout="table"
    >
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Статус</th>
            <th className="px-3 py-2 font-medium">Номенклатура</th>
            <th className="px-3 py-2 font-medium">Категория</th>
            <th className="px-3 py-2 font-medium">Покупатель</th>
            <th className="px-3 py-2 font-medium">Кол-во / цена</th>
            <th className="px-3 py-2 font-medium">План</th>
            <th className="px-3 py-2 font-medium">Исполнитель</th>
            <th className="px-3 py-2 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const overdue = isOverdue(row)
            const urgent = isUrgent(row)
            return (
              <tr
                key={row.id}
                className={cn('border-b border-border last:border-0', rowTone(row))}
                data-testid={`shipment-request-table-${row.id}`}
                data-status={row.status}
                data-kind={row.kind}
              >
                <td className="px-3 py-3 align-top">
                  <ShipmentRequestStatusBadge status={row.status} overdue={overdue} />
                  <div className="mt-1">
                    <ShipmentRequestKindBadge row={row} />
                  </div>
                  {urgent ? (
                    <p className="mt-1 text-xs font-medium text-destructive">
                      {PRIORITY_LABELS.urgent}
                    </p>
                  ) : null}
                  {row.status === 'cancelled' && row.cancelReason ? (
                    <p className="mt-1 text-xs text-muted-foreground" title={row.cancelReason}>
                      Причина: {row.cancelReason}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top">
                  <a
                    href={`/shipment-requests/${row.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {row.inventoryItemName ?? '—'}
                  </a>
                  <p className="text-xs text-muted-foreground">{row.inventoryItemUnit}</p>
                  {row.cropCode ? (
                    <p className="text-xs text-muted-foreground">
                      Культура: {resolveDictionaryLabel(row.cropCode, crops)}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {categoryColumnLabel(row.inventoryItemCategory, row.isHarvest)}
                </td>
                <td className="px-3 py-3 align-top text-foreground">{row.customerName}</td>
                <td className="px-3 py-3 align-top">
                  {row.quantity.toLocaleString('ru-RU')} × {formatMoney(row.price)}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {formatPlannedAt(row.plannedAt)}
                </td>
                <td className="px-3 py-3 align-top text-foreground">
                  {row.assignedToName ?? 'Не назначен'}
                </td>
                <td className="px-3 py-3 align-top">
                  <ShipmentRequestActions
                    row={row}
                    canManage={canManage}
                    busy={busyId === row.id}
                    onStart={onStart}
                    onComplete={onComplete}
                    onCancel={onCancel}
                    onAssign={onAssign}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
