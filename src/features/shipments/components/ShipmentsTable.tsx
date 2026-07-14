import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Shipment } from '@/types'
import { formatKg, formatMoney, sumShipments } from '@/features/shipments/utils'

interface ShipmentsTableProps {
  shipments: Shipment[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (shipment: Shipment) => void
  onDelete: (shipment: Shipment) => void
}

export function ShipmentsTable({
  shipments,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: ShipmentsTableProps) {
  const totals = sumShipments(shipments)
  const showActions = canEdit || canDelete

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Культура</TableHead>
            <TableHead>Кол-во (кг)</TableHead>
            <TableHead>Направление</TableHead>
            <TableHead>Цена/кг</TableHead>
            <TableHead>Сумма</TableHead>
            {showActions ? <TableHead>Действия</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shipments.map((shipment) => (
            <TableRow key={shipment.id}>
              <TableCell>{shipment.date}</TableCell>
              <TableCell className="font-medium">{shipment.cropType}</TableCell>
              <TableCell>{formatKg(shipment.quantityKg)}</TableCell>
              <TableCell>{shipment.destination || '—'}</TableCell>
              <TableCell>
                {shipment.pricePerKg != null ? formatMoney(shipment.pricePerKg) : '—'}
              </TableCell>
              <TableCell>
                {shipment.totalSum != null ? formatMoney(shipment.totalSum) : '—'}
              </TableCell>
              {showActions ? (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted"
                      aria-label="Действия"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canEdit ? (
                        <DropdownMenuItem onClick={() => onEdit(shipment)}>
                          <Pencil className="size-4" />
                          Редактировать
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete ? (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete(shipment)}
                        >
                          <Trash2 className="size-4" />
                          Удалить
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={6} className="font-medium">
              Итого: {formatKg(totals.totalKg)} / {formatMoney(totals.totalSum)}
            </TableCell>
            {showActions ? <TableCell /> : null}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
