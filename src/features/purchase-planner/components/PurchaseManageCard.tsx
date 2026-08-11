import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import { buildPurchaseManageActions } from '../lib/manageActions'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  statusBadgeClass,
  urgencyBadgeClass,
} from '../lib/labels'
import type { PurchasePlannerItem } from '../types'
import { PurchasePhotoGallery } from './PurchasePhotoGallery'

type PurchaseManageCardProps = {
  item: PurchasePlannerItem
  isMobile: boolean
  canEdit: boolean
  canCancel: boolean
  canRevert: boolean
  canDelete: boolean
  onOpen: () => void
  onBuy: () => void
  onEdit: () => void
  onRevert: () => void
  onCancel: () => void
  onDelete: () => void
}

function stop(event: React.SyntheticEvent) {
  event.stopPropagation()
}

export function PurchaseManageCard({
  item,
  isMobile,
  canEdit,
  canCancel,
  canRevert,
  canDelete,
  onOpen,
  onBuy,
  onEdit,
  onRevert,
  onCancel,
  onDelete,
}: PurchaseManageCardProps) {
  const navigate = useNavigate()
  const actions = useMemo(
    () =>
      buildPurchaseManageActions({
        item,
        canEdit,
        canCancel,
        canRevert,
        canDelete,
        onBuy,
        onEdit,
        onRevert,
        onCancel,
        onDelete,
        onRepair: () => {
          void navigate({ to: '/maintenance' })
        },
      }),
    [
      canCancel,
      canDelete,
      canEdit,
      canRevert,
      item,
      navigate,
      onBuy,
      onCancel,
      onDelete,
      onEdit,
      onRevert,
    ],
  )

  return (
    <li>
      <Card
        role="button"
        tabIndex={0}
        className="cursor-pointer shadow-none transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        }}
      >
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2 pt-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-sm">{item.title}</CardTitle>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {CATEGORY_LABELS[item.category] ?? item.category}
              {item.linkedLabel ? ` · ${item.linkedLabel}` : ''}
              {item.responsibleName ? ` · ${item.responsibleName}` : ''}
            </p>
          </div>
          <div className="flex items-start gap-1">
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge variant="outline" className={urgencyBadgeClass(item.urgency)}>
                {URGENCY_LABELS[item.urgency] ?? item.urgency}
              </Badge>
              <Badge variant="outline" className={statusBadgeClass(item.status)}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Badge>
            </div>
            {isMobile && actions.length > 0 ? (
              <CardActionsMenu actions={actions} title={item.title} />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pb-3">
          {item.images.length > 0 ? (
            <PurchasePhotoGallery images={item.images} title={item.title} maxThumbs={3} />
          ) : null}
          <div className="flex flex-col gap-1">
            {item.purchasePlace ? (
              <p className="text-xs text-muted-foreground">Где: {item.purchasePlace}</p>
            ) : null}
            {item.estimatedCost != null ? (
              <p className="text-xs text-foreground">
                Оценка: {item.estimatedCost.toLocaleString('ru-RU')} ₽
              </p>
            ) : null}
            {item.actualCost != null ? (
              <p className="text-xs text-foreground">
                Факт: {item.actualCost.toLocaleString('ru-RU')} ₽
              </p>
            ) : null}
          </div>
          {!isMobile && actions.length > 0 ? (
            <div className="flex flex-wrap gap-2" onClick={stop} onPointerDown={stop}>
              {actions.map((action) => (
                <Button
                  key={action.id}
                  type="button"
                  size="sm"
                  variant={
                    action.variant === 'destructive'
                      ? 'ghost'
                      : action.id === 'buy'
                        ? 'default'
                        : action.id === 'cancel'
                          ? 'ghost'
                          : 'outline'
                  }
                  className={
                    action.variant === 'destructive' ? 'text-destructive' : 'whitespace-nowrap'
                  }
                  onClick={action.onSelect}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </li>
  )
}
