import { memo, useMemo, useRef } from 'react'
import { AlertTriangle, Archive, ArchiveRestore, ClipboardList, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import { humanLabel } from '@/lib/display'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/types'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { isCriticalStock, isHarvestCategory } from '@/features/inventory/utils'
import { StockProgressBar } from './StockProgressBar'

interface InventoryCardProps {
  item: InventoryItem
  categoryLabel: string
  cropLabel?: string | null
  onClick?: (item: InventoryItem) => void
  onEdit?: (item: InventoryItem) => void
  onShipmentRequest?: (item: InventoryItem) => void
  onArchive?: (item: InventoryItem) => void
  onRestore?: (item: InventoryItem) => void
  hasSyncIssue?: boolean
}

export const InventoryCard = memo(function InventoryCard({
  item,
  categoryLabel,
  cropLabel = null,
  onClick,
  onEdit,
  onShipmentRequest,
  onArchive,
  onRestore,
  hasSyncIssue,
}: InventoryCardProps) {
  const isMobile = useIsMobile(639)
  const suppressNavRef = useRef(false)
  const critical = isCriticalStock(item)
  const harvest = isHarvestCategory(item.category) || item.isHarvest
  const archived = item.isActive === false

  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = []
    if (!archived && onShipmentRequest) {
      list.push({
        id: 'shipment',
        label: 'Заявка',
        icon: ClipboardList,
        onSelect: () => onShipmentRequest(item),
      })
    }
    if (onEdit) {
      list.push({
        id: 'edit',
        label: 'Редактировать',
        icon: Pencil,
        onSelect: () => onEdit(item),
      })
    }
    if (!archived && onArchive) {
      list.push({
        id: 'archive',
        label: 'Удалить / архивировать',
        icon: Archive,
        onSelect: () => onArchive(item),
        variant: 'destructive',
      })
    }
    if (archived && onRestore) {
      list.push({
        id: 'restore',
        label: 'Восстановить',
        icon: ArchiveRestore,
        onSelect: () => onRestore(item),
      })
    }
    return list
  }, [archived, item, onArchive, onEdit, onRestore, onShipmentRequest])

  const openDetails = () => {
    if (suppressNavRef.current) return
    onClick?.(item)
  }

  const title = humanLabel(item.name, 'Товар')

  return (
    <Card
      className={cn(
        'gap-0 py-0 transition-colors',
        onClick && 'cursor-pointer hover:border-primary/40',
        critical && 'border-destructive/45 bg-destructive/5 hover:border-destructive/60',
      )}
      onClick={onClick ? openDetails : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openDetails()
              }
            }
          : undefined
      }
    >
      <CardHeader className="space-y-1 px-3 pt-3 pb-1 sm:px-4 sm:pt-3.5 sm:pb-1.5">
        <div className="flex items-start gap-1.5">
          <h3
            className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground line-clamp-2 sm:text-base"
            title={title}
          >
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-0.5">
            {hasSyncIssue ? (
              <Badge
                variant="outline"
                className="size-6 justify-center border-amber-600/40 p-0 text-amber-800"
                title="Офлайн-операция требует проверки"
              >
                <AlertTriangle className="size-3.5" />
              </Badge>
            ) : null}
            {critical ? (
              <Badge
                variant="destructive"
                className="size-6 justify-center p-0 text-xs font-bold"
                title="Критичный остаток"
                aria-label="Критичный остаток"
              >
                !
              </Badge>
            ) : null}
            {actions.length > 0 ? (
              <CardActionsMenu
                actions={actions}
                title={title}
                onOpenChange={(menuOpen) => {
                  if (!menuOpen) {
                    suppressNavRef.current = true
                    window.setTimeout(() => {
                      suppressNavRef.current = false
                    }, 400)
                  }
                }}
              />
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge
            variant="outline"
            className={
              harvest
                ? 'w-fit border-primary/40 bg-primary/5 px-1.5 py-0 text-[11px] text-primary'
                : 'w-fit bg-muted px-1.5 py-0 text-[11px] text-muted-foreground'
            }
            title={
              harvest
                ? 'Складской учёт урожая; KPI по культурам — в «Отгрузках урожая»'
                : undefined
            }
          >
            {categoryLabel}
          </Badge>
          {cropLabel ? (
            <Badge
              variant="outline"
              className="w-fit bg-muted px-1.5 py-0 text-[11px] text-muted-foreground"
            >
              {cropLabel}
            </Badge>
          ) : null}
          {archived ? (
            <Badge
              variant="outline"
              className="w-fit border-muted-foreground/40 px-1.5 py-0 text-[11px] text-muted-foreground"
            >
              Архив
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pt-0 pb-3 sm:px-4 sm:pb-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
            {item.currentStock.toLocaleString('ru-RU')}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {item.unit}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            мин. {item.minStock.toLocaleString('ru-RU')}
          </p>
        </div>
        <StockProgressBar item={item} compact />
        {!isMobile && onShipmentRequest && !archived ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 min-h-8 w-full"
            onClick={(event) => {
              event.stopPropagation()
              event.preventDefault()
              onShipmentRequest(item)
            }}
          >
            <ClipboardList className="size-3.5" />
            Заявка
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
})
