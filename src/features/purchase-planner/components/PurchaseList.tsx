import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useDeletePurchaseItem, useUpdatePurchaseItem } from '../hooks'
import { usePagedItems } from '../hooks/usePagedItems'
import { usePurchaseCapabilities } from '../hooks/usePurchaseCapabilities'
import type { PurchasePlannerItem } from '../types'
import { PurchaseCompleteDialog } from './PurchaseCompleteDialog'
import { PurchaseDetailDialog } from './PurchaseDetailDialog'
import { PurchaseFormDialog } from './PurchaseFormDialog'
import { PurchaseLoadMore } from './PurchaseLoadMore'
import { PurchaseManageCard } from './PurchaseManageCard'

type PurchaseListProps = {
  items: PurchasePlannerItem[]
  /** Reset paging when filters/status change. */
  pageResetKey?: string
  emptyMessage?: string
}

export function PurchaseList({
  items,
  pageResetKey = 'all',
  emptyMessage = 'Список пуст. Добавьте первую закупку.',
}: PurchaseListProps) {
  const update = useUpdatePurchaseItem()
  const remove = useDeletePurchaseItem()
  const caps = usePurchaseCapabilities()
  const isMobile = useIsMobile(639)
  const page = usePagedItems(items, pageResetKey)
  const [detailItem, setDetailItem] = useState<PurchasePlannerItem | null>(null)
  const [editItem, setEditItem] = useState<PurchasePlannerItem | null>(null)
  const [buyItem, setBuyItem] = useState<PurchasePlannerItem | null>(null)
  const [revertItem, setRevertItem] = useState<PurchasePlannerItem | null>(null)

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{emptyMessage}</CardContent>
      </Card>
    )
  }

  return (
    <>
      <ul className="space-y-2">
        {page.visible.map((item) => (
          <PurchaseManageCard
            key={item.id}
            item={item}
            isMobile={isMobile}
            canEdit={caps.canEdit}
            canCancel={caps.canCancel}
            canRevert={caps.canRevert}
            canDelete={caps.canDelete}
            onOpen={() => setDetailItem(item)}
            onBuy={() => setBuyItem(item)}
            onEdit={() => setEditItem(item)}
            onRevert={() => setRevertItem(item)}
            onCancel={() =>
              void update.mutateAsync({ id: item.id, payload: { status: 'cancelled' } })
            }
            onDelete={() => void remove.mutateAsync(item.id)}
          />
        ))}
      </ul>

      <PurchaseLoadMore
        shown={page.shown}
        total={page.total}
        hasMore={page.hasMore}
        onLoadMore={page.loadMore}
      />

      <PurchaseDetailDialog
        item={detailItem}
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
      />

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
