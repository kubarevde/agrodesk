import { Check, Pencil, RotateCcw, Trash2, Wrench, XCircle } from 'lucide-react'
import type { CardActionItem } from '@/components/shared/CardActionsMenu'
import type { PurchasePlannerItem } from '../types'

type BuildManageActionsArgs = {
  item: PurchasePlannerItem
  canEdit: boolean
  canCancel: boolean
  canRevert: boolean
  canDelete: boolean
  onBuy: () => void
  onEdit: () => void
  onRevert: () => void
  onCancel: () => void
  onDelete: () => void
  onRepair?: () => void
}

export function buildPurchaseManageActions({
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
  onRepair,
}: BuildManageActionsArgs): CardActionItem[] {
  const list: CardActionItem[] = []
  if (item.status === 'planned') {
    list.push({ id: 'buy', label: 'Отметить купленным', icon: Check, onSelect: onBuy })
  }
  if (canEdit) {
    list.push({ id: 'edit', label: 'Изменить', icon: Pencil, onSelect: onEdit })
  }
  if (item.status === 'purchased' && canRevert) {
    list.push({
      id: 'revert',
      label: 'Вернуть к покупке',
      icon: RotateCcw,
      onSelect: onRevert,
    })
  }
  if (item.status === 'planned' && canCancel) {
    list.push({ id: 'cancel', label: 'Отменить', icon: XCircle, onSelect: onCancel })
  }
  if (item.maintenanceId && onRepair) {
    list.push({ id: 'repair', label: 'К ремонту', icon: Wrench, onSelect: onRepair })
  }
  if (canDelete) {
    list.push({
      id: 'delete',
      label: 'Удалить',
      icon: Trash2,
      variant: 'destructive',
      onSelect: onDelete,
    })
  }
  return list
}
