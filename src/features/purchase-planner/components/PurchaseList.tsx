import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeletePurchaseItem, useUpdatePurchaseItem } from '../hooks'
import { usePurchaseCapabilities } from '../hooks/usePurchaseCapabilities'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  statusBadgeClass,
  urgencyBadgeClass,
} from '../lib/labels'
import type { PurchasePlannerItem } from '../types'
import { PurchaseCompleteDialog } from './PurchaseCompleteDialog'
import { PurchaseFormDialog } from './PurchaseFormDialog'
import { PurchasePhotoGallery } from './PurchasePhotoGallery'

type PurchaseListProps = {
  items: PurchasePlannerItem[]
}

export function PurchaseList({ items }: PurchaseListProps) {
  const update = useUpdatePurchaseItem()
  const remove = useDeletePurchaseItem()
  const caps = usePurchaseCapabilities()
  const [editItem, setEditItem] = useState<PurchasePlannerItem | null>(null)
  const [buyItem, setBuyItem] = useState<PurchasePlannerItem | null>(null)
  const [revertItem, setRevertItem] = useState<PurchasePlannerItem | null>(null)

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Список пуст. Добавьте первую закупку.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Card className="shadow-none">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2 pt-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-sm">{item.title}</CardTitle>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                    {item.linkedLabel ? ` · ${item.linkedLabel}` : ''}
                    {item.responsibleName ? ` · ${item.responsibleName}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={urgencyBadgeClass(item.urgency)}>
                    {URGENCY_LABELS[item.urgency] ?? item.urgency}
                  </Badge>
                  <Badge variant="outline" className={statusBadgeClass(item.status)}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {item.images.length > 0 ? (
                  <PurchasePhotoGallery images={item.images} title={item.title} />
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
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
                  {item.expenseId ? (
                    <Link to="/expenses" className="text-xs text-primary hover:underline">
                      Связанный расход
                    </Link>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.status === 'planned' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setBuyItem(item)}
                      className="whitespace-nowrap"
                    >
                      Отметить купленным
                    </Button>
                  ) : null}

                  {caps.canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditItem(item)}
                    >
                      Изменить
                    </Button>
                  ) : null}

                  {item.status === 'purchased' && caps.canRevert ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setRevertItem(item)}
                    >
                      Вернуть к покупке
                    </Button>
                  ) : null}

                  {item.status === 'planned' && caps.canCancel ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void update.mutateAsync({ id: item.id, payload: { status: 'cancelled' } })
                      }
                    >
                      Отменить
                    </Button>
                  ) : null}

                  {caps.canDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void remove.mutateAsync(item.id)}
                    >
                      Удалить
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {caps.canEdit ? (
        <PurchaseFormDialog
          open={Boolean(editItem)}
          onClose={() => setEditItem(null)}
          item={editItem}
        />
      ) : null}

      <PurchaseCompleteDialog
        item={buyItem}
        open={Boolean(buyItem)}
        onClose={() => setBuyItem(null)}
      />

      <Dialog open={Boolean(revertItem)} onOpenChange={(open) => !open && setRevertItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Вернуть к покупке?</DialogTitle>
            <DialogDescription>
              Позиция снова появится в списке «к покупке». Связанный расход будет удалён, чтобы
              отчёты не дублировались.
            </DialogDescription>
          </DialogHeader>
          {revertItem ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">{revertItem.title}</p>
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                disabled={update.isPending}
                onClick={() => {
                  void update
                    .mutateAsync({ id: revertItem.id, payload: { status: 'planned' } })
                    .then(() => setRevertItem(null))
                }}
              >
                Подтвердить возврат
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
