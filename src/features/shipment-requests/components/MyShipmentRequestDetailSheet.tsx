import { mediaUrl } from '@/lib/media'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { ShipmentRequest } from '../types'
import {
  canCompleteRequest,
  canStartRequest,
  formatMoney,
  formatPlannedAt,
  formatQtyPrice,
  isOverdue,
  PRIORITY_LABELS,
} from '../labels'
import { ShipmentRequestKindBadge } from './ShipmentRequestKindBadge'
import { ShipmentRequestStatusBadge } from './ShipmentRequestStatusBadge'

type Props = {
  row: ShipmentRequest | null
  open: boolean
  busy?: boolean
  onClose: () => void
  onStart?: (id: string) => void
  onComplete?: (row: ShipmentRequest) => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm text-foreground">{value}</p>
    </div>
  )
}

/**
 * Executor detail view for «Мои заявки ТМЦ» (ShipmentRequest only — not TMC ledger shipments).
 * Mobile: bottom sheet; desktop: right sheet.
 */
export function MyShipmentRequestDetailSheet({
  row,
  open,
  busy = false,
  onClose,
  onStart,
  onComplete,
}: Props) {
  const isMobile = useIsMobile(639)

  if (!row) return null

  const overdue = isOverdue(row)
  const showStart = Boolean(onStart) && canStartRequest(row)
  const showComplete = Boolean(onComplete) && canCompleteRequest(row)
  const unit = row.inventoryItemUnit ?? ''

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        showCloseButton
        className={
          isMobile
            ? 'flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden p-0'
            : 'flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md'
        }
      >
        {isMobile ? (
          <div
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
            aria-hidden
          />
        ) : null}

        <SheetHeader className="shrink-0 space-y-2 border-b border-border px-4 py-4 pr-14 text-left sm:pr-12">
          <SheetTitle className="text-lg leading-snug break-words">
            {row.inventoryItemName ?? 'Заявка ТМЦ'}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap gap-1.5">
            <ShipmentRequestStatusBadge status={row.status} overdue={overdue} />
            <ShipmentRequestKindBadge row={row} />
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DetailRow label="Контрагент" value={row.customerName} />
          <DetailRow
            label="Количество и цена"
            value={formatQtyPrice(row.quantity, unit, row.price)}
          />
          <DetailRow label="Сумма" value={formatMoney(row.quantity * row.price)} />
          <DetailRow
            label="План"
            value={`${formatPlannedAt(row.plannedAt)}${overdue ? ' · просрочено' : ''}`}
          />
          <DetailRow label="Приоритет" value={PRIORITY_LABELS[row.priority]} />
          {row.assignedToName ? (
            <DetailRow label="Исполнитель" value={row.assignedToName} />
          ) : (
            <DetailRow label="Исполнитель" value="Не назначен" />
          )}
          {row.createdByName ? (
            <DetailRow label="Создал" value={row.createdByName} />
          ) : null}

          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Комментарий</p>
            {row.comment?.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {row.comment}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Не указан</p>
            )}
          </div>

          {row.cancelReason ? (
            <DetailRow label="Причина отмены" value={row.cancelReason} />
          ) : null}

          <DetailRow
            label="Склад"
            value={
              row.inventoryOperationId
                ? 'Списан при выполнении'
                : 'Ещё не списан'
            }
          />

          {row.attachments.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Вложения</p>
              <div className="grid grid-cols-2 gap-2">
                {row.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={mediaUrl(file.imageUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-lg border border-border"
                  >
                    <img
                      src={mediaUrl(file.imageUrl)}
                      alt={file.filename}
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {(showStart || showComplete) && (
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
              {showStart ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full sm:min-h-10"
                  disabled={busy}
                  onClick={() => onStart?.(row.id)}
                >
                  Взять в работу
                </Button>
              ) : null}
              {showComplete ? (
                <Button
                  type="button"
                  className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10"
                  disabled={busy}
                  onClick={() => onComplete?.(row)}
                >
                  Выполнено
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
