import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Receipt, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CHECKLIST_STATUS_LABELS,
  purchaseContextLabel,
} from '../lib/checklistMode'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  URGENCY_LABELS,
  statusBadgeClass,
  urgencyBadgeClass,
} from '../lib/labels'
import type { PurchasePlannerItem } from '../types'
import { PurchasePhotoGallery } from './PurchasePhotoGallery'

type PurchaseDetailDialogProps = {
  item: PurchasePlannerItem | null
  open: boolean
  onClose: () => void
  /** Checklist-oriented status wording when true. */
  checklistLabels?: boolean
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value
  return format(parsed, 'd MMM yyyy', { locale: ru })
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export function PurchaseDetailDialog({
  item,
  open,
  onClose,
  checklistLabels = false,
}: PurchaseDetailDialogProps) {
  const navigate = useNavigate()
  if (!item) return null

  const statusLabel = checklistLabels
    ? (CHECKLIST_STATUS_LABELS[item.status] ?? STATUS_LABELS[item.status] ?? item.status)
    : (STATUS_LABELS[item.status] ?? item.status)
  const context = purchaseContextLabel(item)
  const created = formatDate(item.createdAt)
  const purchased = formatDate(item.purchasedAt)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={urgencyBadgeClass(item.urgency)}>
            {URGENCY_LABELS[item.urgency] ?? item.urgency}
          </Badge>
          <Badge variant="outline" className={statusBadgeClass(item.status)}>
            {statusLabel}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow
            label="Категория"
            value={CATEGORY_LABELS[item.category] ?? item.category}
          />
          <DetailRow label="Связь" value={item.linkedLabel} />
          <DetailRow label="Контекст" value={context} />
          <DetailRow label="Где купить" value={item.purchasePlace} />
          <DetailRow label="Ответственный" value={item.responsibleName} />
          <DetailRow
            label="Оценка"
            value={
              item.estimatedCost != null
                ? `${item.estimatedCost.toLocaleString('ru-RU')} ₽`
                : null
            }
          />
          <DetailRow
            label="Факт"
            value={
              item.actualCost != null
                ? `${item.actualCost.toLocaleString('ru-RU')} ₽`
                : null
            }
          />
          <DetailRow label="Создано" value={created} />
          <DetailRow label="Куплено" value={purchased} />
        </div>

        {item.notes ? (
          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">Заметки</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{item.notes}</p>
          </div>
        ) : null}

        {item.images.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground">Фото</p>
            <PurchasePhotoGallery images={item.images} title={item.title} />
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {item.expenseId ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full justify-center sm:w-auto sm:min-h-10"
              onClick={() => {
                onClose()
                void navigate({ to: '/expenses', search: { tab: 'expenses' } })
              }}
            >
              <Receipt className="mr-1.5 size-4" />
              Связанный расход
            </Button>
          ) : null}
          {item.maintenanceId ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full justify-center sm:w-auto sm:min-h-10"
              onClick={() => {
                onClose()
                void navigate({ to: '/maintenance' })
              }}
            >
              <Wrench className="mr-1.5 size-4" />
              К ремонту
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
