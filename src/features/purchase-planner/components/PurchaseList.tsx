import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeletePurchaseItem, useUpdatePurchaseItem } from '../hooks'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  statusBadgeClass,
  urgencyBadgeClass,
} from '../lib/labels'
import type { PurchasePlannerItem } from '../types'
import { PurchaseFormDialog } from './PurchaseFormDialog'

type PurchaseListProps = {
  items: PurchasePlannerItem[]
}

export function PurchaseList({ items }: PurchaseListProps) {
  const update = useUpdatePurchaseItem()
  const remove = useDeletePurchaseItem()
  const [editItem, setEditItem] = useState<PurchasePlannerItem | null>(null)
  const [buyItem, setBuyItem] = useState<PurchasePlannerItem | null>(null)
  const [actualCost, setActualCost] = useState('')
  const [createExpense, setCreateExpense] = useState(true)

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
                <div className="min-w-[180px] space-y-1">
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
                    onClick={() => {
                      setBuyItem(item)
                      setActualCost(item.estimatedCost?.toString() ?? '')
                      setCreateExpense(true)
                    }}
                    className="whitespace-nowrap"
                  >
                    Отметить купленным
                  </Button>
                ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditItem(item)}
                  >
                    Изменить
                  </Button>
                {item.status === 'planned' ? (
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => void remove.mutateAsync(item.id)}
                  >
                    Удалить
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <PurchaseFormDialog
        open={Boolean(editItem)}
        onClose={() => setEditItem(null)}
        item={editItem}
      />

      <Dialog open={Boolean(buyItem)} onOpenChange={(o) => !o && setBuyItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отметить купленным</DialogTitle>
          </DialogHeader>
          {buyItem ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground">{buyItem.title}</p>
              <div className="space-y-1">
                <Label htmlFor="actual-cost">Фактическая стоимость</Label>
                <Input
                  id="actual-cost"
                  type="number"
                  min={0}
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={createExpense}
                  onChange={(e) => setCreateExpense(e.target.checked)}
                />
                Создать расход в разделе «Затраты»
              </label>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  void update
                    .mutateAsync({
                      id: buyItem.id,
                      payload: {
                        status: 'purchased',
                        actualCost: actualCost === '' ? null : Number(actualCost),
                        createExpense,
                        expenseCategory: 'parts',
                      },
                    })
                    .then(() => setBuyItem(null))
                }}
              >
                Подтвердить
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
