import { Link } from '@tanstack/react-router'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Shipment } from '@/types'
import { formatKg, formatMoney } from '@/features/shipments/utils'
import { shortRequestRef } from '@/features/shipments/requestLink'

type Props = {
  shipments: Shipment[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (shipment: Shipment) => void
  onDelete: (shipment: Shipment) => void
}

/** Mobile card list for crop shipments (table stays on md+). */
export function ShipmentsCards({
  shipments,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: Props) {
  const showActions = canEdit || canDelete

  return (
    <ul className="space-y-3 md:hidden" data-layout="cards" data-testid="shipments-cards">
      {shipments.map((shipment) => (
        <li
          key={shipment.id}
          className="rounded-xl border border-border bg-surface p-4"
          data-testid={`shipment-card-${shipment.id}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">{shipment.cropType}</p>
              <p className="text-sm text-muted-foreground">{shipment.date}</p>
            </div>
            {showActions ? (
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
                      Изменить
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(shipment)}
                    >
                      <Trash2 className="size-4" />
                      Удалить
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-foreground">
            {formatKg(shipment.quantityKg)}
            {shipment.totalSum != null ? ` · ${formatMoney(shipment.totalSum)}` : ''}
          </p>
          {shipment.destination ? (
            <p className="mt-1 text-xs text-muted-foreground">{shipment.destination}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">Источник: урожай (не склад ТМЦ)</p>
          {shipment.shipmentRequestId ? (
            <Link
              to="/shipment-requests/$requestId"
              params={{ requestId: shipment.shipmentRequestId }}
              className="mt-2 inline-flex"
            >
              <Badge variant="outline" className="w-fit text-primary">
                по заявке #{shortRequestRef(shipment.shipmentRequestId)}
              </Badge>
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
