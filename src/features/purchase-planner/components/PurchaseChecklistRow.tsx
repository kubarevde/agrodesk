import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Check, Clock, Wrench, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import { useUpdatePurchaseItem } from '../hooks'
import { usePurchaseCapabilities } from '../hooks/usePurchaseCapabilities'
import {
  CHECKLIST_STATUS_LABELS,
  purchaseContextLabel,
} from '../lib/checklistMode'
import { URGENCY_LABELS, urgencyBadgeClass } from '../lib/labels'
import type { PurchasePlannerItem } from '../types'
import { PurchaseCompleteDialog } from './PurchaseCompleteDialog'
import { PurchaseDetailDialog } from './PurchaseDetailDialog'
import { PurchasePhotoGallery } from './PurchasePhotoGallery'

type PurchaseChecklistRowProps = {
  item: PurchasePlannerItem
  onPurchased?: () => void
}

function stop(event: React.SyntheticEvent) {
  event.stopPropagation()
}

export function PurchaseChecklistRow({ item, onPurchased }: PurchaseChecklistRowProps) {
  const navigate = useNavigate()
  const update = useUpdatePurchaseItem()
  const caps = usePurchaseCapabilities()
  const [completeOpen, setCompleteOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const context = purchaseContextLabel(item)
  const isOpen = item.status === 'planned'

  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = []
    if (isOpen) {
      list.push({
        id: 'defer',
        label: 'Отложить',
        icon: Clock,
        onSelect: () => {
          const note = item.notes?.includes('отложено')
            ? item.notes
            : [item.notes, 'отложено'].filter(Boolean).join(' · ')
          void update.mutateAsync({ id: item.id, payload: { notes: note } })
        },
      })
      if (caps.canCancel) {
        list.push({
          id: 'cancel',
          label: 'Отменить',
          icon: XCircle,
          onSelect: () => {
            void update.mutateAsync({ id: item.id, payload: { status: 'cancelled' } })
          },
        })
      }
    }
    if (item.maintenanceId) {
      list.push({
        id: 'repair',
        label: 'К ремонту',
        icon: Wrench,
        onSelect: () => {
          void navigate({ to: '/maintenance' })
        },
      })
    }
    return list
  }, [caps.canCancel, isOpen, item.id, item.maintenanceId, item.notes, navigate, update])

  return (
    <>
      <li
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer items-stretch gap-2 rounded-xl border border-border bg-surface px-3 py-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          isOpen ? '' : 'opacity-60'
        }`}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setDetailOpen(true)
          }
        }}
      >
        {isOpen ? (
          <Button
            type="button"
            size="icon"
            className="size-11 shrink-0 rounded-full"
            disabled={update.isPending}
            onClick={(event) => {
              stop(event)
              setCompleteOpen(true)
            }}
            onPointerDown={stop}
            onKeyDown={stop}
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

          {item.images.length > 0 ? (
            <PurchasePhotoGallery images={item.images} title={item.title} maxThumbs={3} />
          ) : null}

          {!isOpen ? (
            <p className="text-xs text-success">
              {CHECKLIST_STATUS_LABELS[item.status] ?? item.status}
            </p>
          ) : null}
        </div>

        {actions.length > 0 ? <CardActionsMenu actions={actions} title={item.title} /> : null}
      </li>

      <PurchaseDetailDialog
        item={item}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        checklistLabels
      />

      <PurchaseCompleteDialog
        item={item}
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onCompleted={onPurchased}
      />
    </>
  )
}
