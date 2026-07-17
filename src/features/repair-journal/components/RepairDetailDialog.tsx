import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import {
  useAddChecklistItem,
  useToggleChecklistItem,
  useUpdateRepair,
} from '../hooks'
import {
  useChecklistToPurchasePlanner,
  usePurchaseItems,
} from '@/features/purchase-planner/hooks'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import {
  getPriorityBadgeClass,
  getStatusBadgeClass,
  ITEM_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../lib/labels'
import type { ChecklistItemType, RepairJournalEntry, RepairStatus } from '../types'

type RepairDetailDialogProps = {
  entry: RepairJournalEntry | null
  open: boolean
  onClose: () => void
}

const STATUS_OPTIONS = selectOptions([
  { value: 'in_progress', label: 'В ремонте' },
  { value: 'waiting_parts', label: 'Ожидает запчасти' },
  { value: 'done', label: 'Готово' },
])

export function RepairDetailDialog({ entry, open, onClose }: RepairDetailDialogProps) {
  const toggle = useToggleChecklistItem()
  const addItem = useAddChecklistItem()
  const update = useUpdateRepair()
  const toPlanner = useChecklistToPurchasePlanner()
  const { data: linkedPurchases = [] } = usePurchaseItems(
    { maintenanceId: entry?.id },
    Boolean(entry?.id) && open,
  )
  const [newType, setNewType] = useState<ChecklistItemType>('buy')
  const [newText, setNewText] = useState('')
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [createExpense, setCreateExpense] = useState(true)

  if (!entry) return null

  const handleComplete = async () => {
    await update.mutateAsync({
      id: entry.id,
      payload: {
        status: 'done',
        dateReturned: returnDate,
        createExpense,
      },
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="space-y-1">
            {entry.equipmentId ? (
              <Link
                to="/equipment/$equipmentId"
                params={{ equipmentId: entry.equipmentId }}
                className="text-primary hover:underline"
              >
                {entry.assetLabel}
              </Link>
            ) : entry.implementId ? (
              <Link
                to="/implements/$implementId"
                params={{ implementId: entry.implementId }}
                className="text-primary hover:underline"
              >
                {entry.assetLabel}
              </Link>
            ) : (
              entry.assetLabel
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={getStatusBadgeClass(entry.status)}>
              {STATUS_LABELS[entry.status] ?? entry.status}
            </Badge>
            <Badge variant="outline" className={getPriorityBadgeClass(entry.priority)}>
              {PRIORITY_LABELS[entry.priority] ?? entry.priority}
            </Badge>
          </div>
          {entry.description ? (
            <p className="text-sm text-muted-foreground">{entry.description}</p>
          ) : null}

          {linkedPurchases.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">Закупки для ремонта</h3>
                <Link
                  to="/purchase-planner"
                  search={purchasePlannerSearch({
                    mode: 'checklist',
                    maintenanceId: entry.id,
                    equipmentId: entry.equipmentId ?? undefined,
                    implementId: entry.implementId ?? undefined,
                  })}
                  className="text-xs text-primary hover:underline"
                >
                  Весь список
                </Link>
              </div>
              <ul className="space-y-1 text-sm">
                {linkedPurchases.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className={p.status === 'purchased' ? 'line-through opacity-70' : ''}>
                      {p.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.status === 'purchased' ? 'куплено' : 'к покупке'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">
              Чек-лист ({entry.checklistDone}/{entry.checklistTotal})
            </h3>
            <ul className="space-y-2">
              {entry.checklistItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={item.isDone}
                    onChange={(e) =>
                      void toggle.mutateAsync({ itemId: item.id, isDone: e.target.checked })
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className={item.isDone ? 'text-sm line-through opacity-70' : 'text-sm'}>
                      <span className="text-muted-foreground">
                        {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}:{' '}
                      </span>
                      {item.description}
                    </p>
                    {item.cost != null ? (
                      <p className="text-xs text-muted-foreground">
                        {item.cost.toLocaleString('ru-RU')} ₽
                      </p>
                    ) : null}
                    {item.itemType === 'buy' && !item.isDone ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={toPlanner.isPending}
                        onClick={() => void toPlanner.mutateAsync(item.id)}
                      >
                        <ShoppingCart className="mr-1 size-3.5" />
                        В планировщик закупок
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 sm:flex-row">
              <LabeledSelect
                className="sm:w-40"
                value={newType}
                options={selectOptions([
                  { value: 'buy', label: 'Купить' },
                  { value: 'repair', label: 'Отремонтировать' },
                ])}
                onValueChange={(v) => setNewType((v as ChecklistItemType) || 'buy')}
              />
              <Input
                placeholder="Новый пункт"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                disabled={!newText.trim() || addItem.isPending}
                onClick={() => {
                  void addItem
                    .mutateAsync({
                      repairId: entry.id,
                      item: { itemType: newType, description: newText.trim() },
                    })
                    .then(() => setNewText(''))
                }}
              >
                Добавить
              </Button>
            </div>
          </div>

          {entry.status !== 'done' ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-medium">Завершить ремонт</h3>
              <LabeledSelect
                value={entry.status}
                options={STATUS_OPTIONS}
                onValueChange={(v) => {
                  if (v && v !== 'done') {
                    void update.mutateAsync({
                      id: entry.id,
                      payload: { status: v as RepairStatus },
                    })
                  }
                }}
              />
              <div className="space-y-1">
                <Label htmlFor="return-date">Дата возврата в строй</Label>
                <Input
                  id="return-date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={createExpense}
                  onChange={(e) => setCreateExpense(e.target.checked)}
                />
                Создать затрату по сумме чек-листа (если ещё нет)
              </label>
              <Button type="button" className="w-full" onClick={() => void handleComplete()}>
                Вернуть в строй
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Возврат: {entry.dateReturned ?? '—'}
              {entry.expenseId ? (
                <>
                  {' · '}
                  <Link to="/expenses" className="text-primary hover:underline">
                    Связанная затрата
                  </Link>
                </>
              ) : null}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
