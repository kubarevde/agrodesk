import { Link } from '@tanstack/react-router'
import { ClipboardList, Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TmcShipment } from '@/types'
import { getCategoryLabel } from '@/features/inventory/utils'
import { shortRequestRef } from '../requestLink'
import { formatTmcMoney, formatTmcQty, sumTmcRevenue } from '../tmcUtils'
import { cn } from '@/lib/utils'

type Props = {
  rows: TmcShipment[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (row: TmcShipment) => void
  onDelete: (row: TmcShipment) => void
  onRowClick?: (row: TmcShipment) => void
}

export function TmcShipmentsTable({
  rows,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRowClick,
}: Props) {
  const totalSum = sumTmcRevenue(rows)
  const showActions = canEdit || canDelete

  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block" data-layout="table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Позиция</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Кол-во</TableHead>
            <TableHead>Направление</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Заявка</TableHead>
            {showActions ? <TableHead>Действия</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const actions: CardActionItem[] = [
              ...(canEdit
                ? [{ id: 'edit', label: 'Редактировать', icon: Pencil, onSelect: () => onEdit(row) }]
                : []),
              ...(canDelete
                ? [
                    {
                      id: 'delete',
                      label: 'Удалить',
                      icon: Trash2,
                      variant: 'destructive' as const,
                      onSelect: () => onDelete(row),
                    },
                  ]
                : []),
            ]
            return (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <TableCell>{row.date}</TableCell>
                <TableCell className="font-medium">{row.itemName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {getCategoryLabel(row.category)}
                </TableCell>
                <TableCell>{formatTmcQty(row.quantity, row.unit)}</TableCell>
                <TableCell>
                  {row.destination || '—'}
                  {row.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      {row.notes}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row.pricePerUnit != null ? formatTmcMoney(row.pricePerUnit) : '—'}
                </TableCell>
                <TableCell>
                  {row.totalSum != null ? formatTmcMoney(row.totalSum) : '—'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {row.shipmentRequestId ? (
                    <Link
                      to="/shipment-requests/$requestId"
                      params={{ requestId: row.shipmentRequestId }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ClipboardList className="size-3.5" />
                      #{shortRequestRef(row.shipmentRequestId)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                {showActions ? (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <CardActionsMenu actions={actions} title={row.itemName} />
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={8} className="font-medium">
              Итого: {formatTmcMoney(totalSum)}
            </TableCell>
            {showActions ? <TableCell /> : null}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

export function TmcShipmentsCards({
  rows,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRowClick,
}: Props) {
  return (
    <ul className="space-y-3 md:hidden" data-layout="cards">
      {rows.map((row) => (
        <TmcCard
          key={row.id}
          row={row}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={onEdit}
          onDelete={onDelete}
          onRowClick={onRowClick}
        />
      ))}
    </ul>
  )
}

function TmcCard({
  row,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRowClick,
}: {
  row: TmcShipment
  canEdit: boolean
  canDelete: boolean
  onEdit: (row: TmcShipment) => void
  onDelete: (row: TmcShipment) => void
  onRowClick?: (row: TmcShipment) => void
}) {
  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = []
    if (canEdit) {
      list.push({ id: 'edit', label: 'Изменить', icon: Pencil, onSelect: () => onEdit(row) })
    }
    if (canDelete) {
      list.push({
        id: 'delete',
        label: 'Удалить',
        icon: Trash2,
        variant: 'destructive',
        onSelect: () => onDelete(row),
      })
    }
    return list
  }, [canDelete, canEdit, onDelete, onEdit, row])

  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-surface p-4',
        onRowClick && 'cursor-pointer hover:border-primary/40',
      )}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      role={onRowClick ? 'button' : undefined}
      tabIndex={onRowClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{row.itemName}</p>
          <p className="text-sm text-muted-foreground">{row.date}</p>
        </div>
        {actions.length > 0 ? (
          <div onClick={(e) => e.stopPropagation()}>
            <CardActionsMenu actions={actions} title={row.itemName} />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-foreground">
        {formatTmcQty(row.quantity, row.unit)}
        {row.totalSum != null ? ` · ${formatTmcMoney(row.totalSum)}` : ''}
      </p>
      <p className="text-xs text-muted-foreground">{getCategoryLabel(row.category)}</p>
      {row.destination ? (
        <p className="mt-1 text-xs text-muted-foreground">{row.destination}</p>
      ) : null}
      {row.notes ? (
        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{row.notes}</p>
      ) : null}
    </li>
  )
}
