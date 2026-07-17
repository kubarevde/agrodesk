import { Link } from '@tanstack/react-router'
import { Check, MoreHorizontal, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdatePurchaseItem } from '../hooks'
import {
  CHECKLIST_STATUS_LABELS,
  purchaseContextLabel,
} from '../lib/checklistMode'
import { URGENCY_LABELS, urgencyBadgeClass } from '../lib/labels'
import type { PurchasePlannerItem } from '../types'

type PurchaseChecklistRowProps = {
  item: PurchasePlannerItem
  onPurchased?: () => void
}

export function PurchaseChecklistRow({ item, onPurchased }: PurchaseChecklistRowProps) {
  const update = useUpdatePurchaseItem()
  const context = purchaseContextLabel(item)
  const isOpen = item.status === 'planned'

  const markPurchased = () => {
    void update
      .mutateAsync({ id: item.id, payload: { status: 'purchased' } })
      .then(() => onPurchased?.())
  }

  const deferItem = () => {
    const note = item.notes?.includes('отложено')
      ? item.notes
      : [item.notes, 'отложено'].filter(Boolean).join(' · ')
    void update.mutateAsync({ id: item.id, payload: { notes: note } })
  }

  const cancelItem = () => {
    void update.mutateAsync({ id: item.id, payload: { status: 'cancelled' } })
  }

  return (
    <li
      className={`flex items-stretch gap-2 rounded-xl border border-border bg-surface px-3 py-3 ${
        isOpen ? '' : 'opacity-60'
      }`}
    >
      {isOpen ? (
        <Button
          type="button"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          disabled={update.isPending}
          onClick={markPurchased}
          aria-label="Отметить купленным"
        >
          <Check className="size-5" />
        </Button>
      ) : (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
          <Check className="size-5" />
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className={`text-sm font-medium text-foreground ${isOpen ? '' : 'line-through'}`}>
            {item.title}
          </p>
          <Badge variant="outline" className={urgencyBadgeClass(item.urgency)}>
            {URGENCY_LABELS[item.urgency] ?? item.urgency}
          </Badge>
        </div>

        {context ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {item.maintenanceId ? <Wrench className="size-3 shrink-0" /> : null}
            {context}
          </p>
        ) : null}

        {item.purchasePlace ? (
          <p className="text-xs text-muted-foreground">Где: {item.purchasePlace}</p>
        ) : null}

        {item.notes ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>
        ) : null}

        {!isOpen ? (
          <p className="text-xs text-success">
            {CHECKLIST_STATUS_LABELS[item.status] ?? item.status}
          </p>
        ) : null}
      </div>

      {isOpen ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md hover:bg-muted/30"
            aria-label="Дополнительные действия"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={deferItem}>Отложить</DropdownMenuItem>
            <DropdownMenuItem onClick={cancelItem}>Отменить</DropdownMenuItem>
            {item.maintenanceId ? (
              <DropdownMenuItem>
                <Link to="/maintenance" className="w-full">
                  К ремонту
                </Link>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  )
}
