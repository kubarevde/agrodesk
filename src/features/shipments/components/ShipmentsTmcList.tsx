import { ExternalLink } from 'lucide-react'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPlannedAt, formatQtyPrice } from '@/features/shipment-requests/labels'
import type { ShipmentRequest } from '@/features/shipment-requests/types'
import { cn } from '@/lib/utils'

type Props = {
  rows: ShipmentRequest[]
  onOpen: (id: string) => void
}

function requestActions(row: ShipmentRequest, onOpen: (id: string) => void): CardActionItem[] {
  return [
    {
      id: 'open',
      label: 'Открыть заявку',
      icon: ExternalLink,
      onSelect: () => onOpen(row.id),
    },
  ]
}

export function ShipmentsTmcList({ rows, onOpen }: Props) {
  return (
    <>
      <ul className="space-y-3 md:hidden" data-layout="cards">
        {rows.map((row) => (
          <li
            key={row.id}
            role="button"
            tabIndex={0}
            className={cn(
              'cursor-pointer rounded-xl border border-border bg-surface p-4',
              'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            data-source="shipment_request"
            data-kind="inventory"
            data-testid={`tmc-outbound-card-${row.id}`}
            onClick={() => onOpen(row.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(row.id)
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">
                  {row.inventoryItemName ?? 'Позиция'}
                </p>
                <p className="text-sm text-muted-foreground">{row.customerName}</p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <CardActionsMenu
                  actions={requestActions(row, onOpen)}
                  title={row.inventoryItemName ?? 'Заявка'}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground">
              {formatQtyPrice(row.quantity, row.inventoryItemUnit, row.price)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.completedAt ? formatPlannedAt(row.completedAt) : '—'}
            </p>
          </li>
        ))}
      </ul>

      <div
        className="hidden overflow-x-auto rounded-lg border border-border md:block"
        data-layout="table"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата выполнения</TableHead>
              <TableHead>Номенклатура</TableHead>
              <TableHead>Покупатель</TableHead>
              <TableHead>Кол-во / цена</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                data-source="shipment_request"
                data-kind="inventory"
                data-testid={`tmc-outbound-row-${row.id}`}
                onClick={() => onOpen(row.id)}
              >
                <TableCell>
                  {row.completedAt ? formatPlannedAt(row.completedAt) : '—'}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.inventoryItemName ?? 'Позиция'}
                </TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell>
                  {formatQtyPrice(row.quantity, row.inventoryItemUnit, row.price)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CardActionsMenu
                    actions={requestActions(row, onOpen)}
                    title={row.inventoryItemName ?? 'Заявка'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
