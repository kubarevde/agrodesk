import { Link } from '@tanstack/react-router'
import { ClipboardList, Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import type { Shipment } from '@/types'
import { formatKg, formatMoney, sumShipments } from '@/features/shipments/utils'
import { shortRequestRef } from '@/features/shipments/requestLink'

interface ShipmentsTableProps {
  shipments: Shipment[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (shipment: Shipment) => void
  onDelete: (shipment: Shipment) => void
  onRowClick?: (shipment: Shipment) => void
}

export function ShipmentsTable({
  shipments,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRowClick,
}: ShipmentsTableProps) {
  const totals = sumShipments(shipments)
  const showActions = canEdit || canDelete

  return (
    <div
      className="hidden overflow-x-auto rounded-lg border border-border md:block"
      data-layout="table"
      data-testid="shipments-table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Культура</TableHead>
            <TableHead>Кол-во (кг)</TableHead>
            <TableHead>Направление</TableHead>
            <TableHead>Цена/кг</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Заявка</TableHead>
            {showActions ? <TableHead>Действия</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => {
            const rowActions = [
              ...(canEdit
                ? [
                    {
                      id: 'edit',
                      label: 'Редактировать',
                      icon: Pencil,
                      onSelect: () => onEdit(shipment),
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      id: 'delete',
                      label: 'Удалить',
                      icon: Trash2,
                      variant: 'destructive' as const,
                      onSelect: () => onDelete(shipment),
                    },
                  ]
                : []),
            ]
            return (
              <TableRow
                key={shipment.id}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={onRowClick ? () => onRowClick(shipment) : undefined}
              >
                <TableCell>{shipment.date}</TableCell>
                <TableCell className="font-medium">{shipment.cropType}</TableCell>
                <TableCell>{formatKg(shipment.quantityKg)}</TableCell>
                <TableCell>
                  {shipment.destination || '—'}
                  {shipment.notes ? (
                    <p className="mt-1 text-xs font-normal text-muted-foreground whitespace-pre-wrap">
                      {shipment.notes}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {shipment.pricePerKg != null ? formatMoney(shipment.pricePerKg) : '—'}
                </TableCell>
                <TableCell>
                  {shipment.totalSum != null ? formatMoney(shipment.totalSum) : '—'}
                  <p className="text-xs font-normal text-muted-foreground">урожай</p>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {shipment.shipmentRequestId ? (
                    <Link
                      to="/shipment-requests/$requestId"
                      params={{ requestId: shipment.shipmentRequestId }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      title="Открыть заявку"
                    >
                      <ClipboardList className="size-3.5" />
                      по заявке #{shortRequestRef(shipment.shipmentRequestId)}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                {showActions ? (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <CardActionsMenu actions={rowActions} title={shipment.cropType} />
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={7} className="font-medium">
              Итого: {formatKg(totals.totalKg)} / {formatMoney(totals.totalSum)}
            </TableCell>
            {showActions ? <TableCell /> : null}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
