import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDictionary } from '@/features/dictionaries/hooks'
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
import { getPriorityBadgeClass, PRIORITY_LABELS, shouldShowRepairPriority } from '../lib/labels'
import type {
  ChecklistItem,
  ChecklistItemType,
  RepairJournalEntry,
  RepairPriority,
  RepairStatus,
} from '../types'
import { ChecklistItemTypeToggle } from './ChecklistItemTypeToggle'
import { RepairChecklistRow } from './RepairChecklistRow'
import { RepairStatusBadges } from './RepairStatusBadges'
import { RepairStatusPanel } from './RepairStatusPanel'

type RepairDetailDialogProps = {
  entry: RepairJournalEntry | null
  open: boolean
  onClose: () => void
}

export function RepairDetailDialog({ entry, open, onClose }: RepairDetailDialogProps) {
  const toggle = useToggleChecklistItem()
  const addItem = useAddChecklistItem()
  const update = useUpdateRepair()
  const toPlanner = useChecklistToPurchasePlanner()
  const { data: statusDict = [] } = useDictionary('repair_status')
  const { data: linkedPurchases = [] } = usePurchaseItems(
    { maintenanceId: entry?.id },
    Boolean(entry?.id) && open,
  )
  const [newType, setNewType] = useState<ChecklistItemType>('buy')
  const [newText, setNewText] = useState('')
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [createExpense, setCreateExpense] = useState(true)
  const [localItems, setLocalItems] = useState<ChecklistItem[]>([])
  const [localWaiting, setLocalWaiting] = useState(false)
  const [localStatus, setLocalStatus] = useState('in_progress')
  const [localPriority, setLocalPriority] = useState<RepairPriority | string>('normal')

  useEffect(() => {
    if (!open || !entry) return
    setLocalItems(entry.checklistItems)
    setLocalWaiting(entry.waitingParts)
    setLocalStatus(entry.status)
    setLocalPriority(entry.priority)
    setReturnDate(entry.dateReturned ?? new Date().toISOString().slice(0, 10))
    // Snapshot once per open / repair id — draft edits stay local until Save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry?.id])

  const checklistDone = useMemo(
    () => localItems.filter((item) => item.isDone).length,
    [localItems],
  )

  const hasStatusChanges = useMemo(() => {
    if (!entry) return false
    const waitingImplied =
      localStatus === 'waiting_parts' ? true : localWaiting
    const savedWaiting =
      entry.status === 'waiting_parts' ? true : entry.waitingParts
    return (
      localStatus !== entry.status ||
      waitingImplied !== savedWaiting ||
      localPriority !== entry.priority
    )
  }, [entry, localStatus, localWaiting, localPriority])

  if (!entry) return null

  const handleToggle = (itemId: string, isDone: boolean) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, isDone, doneAt: isDone ? new Date().toISOString() : null }
          : item,
      ),
    )
    toggle.mutate({ itemId, isDone })
  }

  const handleStatusChange = (status: RepairStatus) => {
    setLocalStatus(status)
    if (status === 'waiting_parts') setLocalWaiting(true)
  }

  const handleWaitingChange = (waiting: boolean) => {
    setLocalWaiting(waiting)
  }

  const buildStatusPayload = (status: RepairStatus) => {
    const waitingParts = status === 'waiting_parts' ? true : localWaiting
    if (status === 'done') {
      return {
        status: 'done' as const,
        waitingParts,
        priority: localPriority as RepairPriority,
        dateReturned: returnDate,
        createExpense,
      }
    }
    return {
      status,
      waitingParts,
      priority: localPriority as RepairPriority,
    }
  }

  const handleSave = async () => {
    const saved = await update.mutateAsync({
      id: entry.id,
      payload: buildStatusPayload(localStatus as RepairStatus),
    })
    setLocalStatus(saved.status)
    setLocalWaiting(saved.waitingParts)
    setLocalPriority(saved.priority)
  }

  const handleComplete = async () => {
    setLocalStatus('done')
    await update.mutateAsync({
      id: entry.id,
      payload: {
        status: 'done',
        waitingParts: localWaiting,
        priority: localPriority as RepairPriority,
        dateReturned: returnDate,
        createExpense,
      },
    })
    onClose()
  }

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (isOpen) return
    if (hasStatusChanges) {
      void handleSave().finally(() => onClose())
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="space-y-1 text-base sm:text-lg">
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
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <RepairStatusBadges
              status={localStatus}
              waitingParts={localWaiting}
              dict={statusDict}
            />
            {shouldShowRepairPriority({
              status: localStatus,
              waitingParts: localWaiting,
            }) ? (
              <Badge variant="outline" className={getPriorityBadgeClass(localPriority)}>
                {PRIORITY_LABELS[localPriority] ?? localPriority}
              </Badge>
            ) : null}
          </div>
          {entry.description ? (
            <p className="text-sm text-muted-foreground">{entry.description}</p>
          ) : null}

          {linkedPurchases.length > 0 ? (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-2.5">
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
              <ul className="space-y-0.5 text-sm">
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
              Чек-лист ({checklistDone}/{localItems.length || entry.checklistTotal})
            </h3>
            <ul className="space-y-1.5">
              {localItems.map((item) => (
                <RepairChecklistRow
                  key={item.id}
                  item={item}
                  onToggle={(isDone) => handleToggle(item.id, isDone)}
                  onToPlanner={
                    item.itemType === 'buy' && !item.isDone
                      ? () => {
                          void toPlanner.mutateAsync(item.id)
                        }
                      : undefined
                  }
                  toPlannerPending={toPlanner.isPending}
                />
              ))}
            </ul>

            <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-2.5">
              <ChecklistItemTypeToggle value={newType} onChange={setNewType} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Новый пункт"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="min-h-11 min-w-0 flex-1 text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newText.trim() && !addItem.isPending) {
                      e.preventDefault()
                      void addItem
                        .mutateAsync({
                          repairId: entry.id,
                          item: { itemType: newType, description: newText.trim() },
                        })
                        .then((created) => {
                          setLocalItems((prev) =>
                            prev.some((row) => row.id === created.id)
                              ? prev
                              : [...prev, created],
                          )
                          setNewText('')
                        })
                    }
                  }}
                />
                <Button
                  type="button"
                  className="min-h-11 shrink-0 sm:px-4"
                  disabled={!newText.trim() || addItem.isPending}
                  onClick={() => {
                    void addItem
                      .mutateAsync({
                        repairId: entry.id,
                        item: { itemType: newType, description: newText.trim() },
                      })
                      .then((created) => {
                        setLocalItems((prev) =>
                          prev.some((row) => row.id === created.id)
                            ? prev
                            : [...prev, created],
                        )
                        setNewText('')
                      })
                  }}
                >
                  Добавить
                </Button>
              </div>
            </div>
          </div>

          <RepairStatusPanel
            status={localStatus}
            waitingParts={localWaiting}
            priority={localPriority}
            statusDict={statusDict}
            returnDate={returnDate}
            createExpense={createExpense}
            hasChanges={hasStatusChanges}
            savePending={update.isPending}
            onStatusChange={handleStatusChange}
            onWaitingPartsChange={handleWaitingChange}
            onPriorityChange={setLocalPriority}
            onReturnDateChange={setReturnDate}
            onCreateExpenseChange={setCreateExpense}
            onSave={() => void handleSave()}
            onComplete={() => void handleComplete()}
          />

          {entry.status === 'done' && entry.dateReturned && !hasStatusChanges ? (
            <p className="text-sm text-muted-foreground">
              Возврат: {entry.dateReturned}
              {entry.expenseId ? (
                <>
                  {' · '}
                  <Link to="/expenses" search={{ tab: 'expenses' }} className="text-primary hover:underline">
                    Связанная затрата
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
