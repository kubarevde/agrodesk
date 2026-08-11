import { Link } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import type { Shipment } from '@/types'
import { formatKg, formatMoney } from '@/features/shipments/utils'
import { shortRequestRef } from '@/features/shipments/requestLink'
import { cn } from '@/lib/utils'

type Props = {
  shipments: Shipment[]
  canEdit: boolean
  canDelete: boolean
  onEdit: (shipment: Shipment) => void
  onDelete: (shipment: Shipment) => void
  onRowClick?: (shipment: Shipment) => void
}

/** Mobile card list for crop shipments (table stays on md+). */
export function ShipmentsCards({
  shipments,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRowClick,
}: Props) {
  return (
    <ul className="space-y-3 md:hidden" data-layout="cards" data-testid="shipments-cards">
      {shipments.map((shipment) => (
        <ShipmentCardRow
          key={shipment.id}
          shipment={shipment}
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

function ShipmentCardRow({
  shipment,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onRowClick,
}: {
  shipment: Shipment
  canEdit: boolean
  canDelete: boolean
  onEdit: (shipment: Shipment) => void
  onDelete: (shipment: Shipment) => void
  onRowClick?: (shipment: Shipment) => void
}) {
  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = []
    if (canEdit) {
      list.push({
        id: 'edit',
        label: 'Изменить',
        icon: Pencil,
        onSelect: () => onEdit(shipment),
      })
    }
    if (canDelete) {
      list.push({
        id: 'delete',
        label: 'Удалить',
        icon: Trash2,
        variant: 'destructive',
        onSelect: () => onDelete(shipment),
      })
    }
    return list
  }, [canDelete, canEdit, onDelete, onEdit, shipment])

  return (
    <li
      className={cn(
        'rounded-xl border border-border bg-surface p-4',
        onRowClick && 'cursor-pointer hover:border-primary/40',
      )}
      data-testid={`shipment-card-${shipment.id}`}
      onClick={onRowClick ? () => onRowClick(shipment) : undefined}
      onKeyDown={
        onRowClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onRowClick(shipment)
              }
            }
          : undefined
      }
      role={onRowClick ? 'button' : undefined}
      tabIndex={onRowClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{shipment.cropType}</p>
          <p className="text-sm text-muted-foreground">{shipment.date}</p>
        </div>
        {actions.length > 0 ? (
          <div onClick={(e) => e.stopPropagation()}>
            <CardActionsMenu actions={actions} title={shipment.cropType} />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-foreground">
        {formatKg(shipment.quantityKg)}
        {shipment.totalSum != null ? ` · ${formatMoney(shipment.totalSum)}` : ''}
      </p>
      {shipment.destination ? (
        <p className="mt-1 text-xs text-muted-foreground">{shipment.destination}</p>
      ) : null}
      {shipment.notes ? (
        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{shipment.notes}</p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">Источник: урожай</p>
      {shipment.shipmentRequestId ? (
        <Link
          to="/shipment-requests/$requestId"
          params={{ requestId: shipment.shipmentRequestId }}
          className="mt-2 inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge variant="outline" className="w-fit text-primary">
            по заявке #{shortRequestRef(shipment.shipmentRequestId)}
          </Badge>
        </Link>
      ) : null}
    </li>
  )
}
