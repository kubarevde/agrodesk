import { AlertTriangle, ClipboardList, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { humanLabel } from '@/lib/display'
import type { InventoryItem } from '@/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import { getCategoryLabel, isCriticalStock, isHarvestCategory } from '@/features/inventory/utils'
import { StockProgressBar } from './StockProgressBar'

interface InventoryCardProps {
  item: InventoryItem
  onClick?: (item: InventoryItem) => void
  onEdit?: (item: InventoryItem) => void
  onShipmentRequest?: (item: InventoryItem) => void
  /** Offline sync conflict / error for this item */
  hasSyncIssue?: boolean
}

export function InventoryCard({
  item,
  onClick,
  onEdit,
  onShipmentRequest,
  hasSyncIssue,
}: InventoryCardProps) {
  const critical = isCriticalStock(item)
  const { data: categories = [] } = useDictionary('inventory_category')
  const { data: crops = [] } = useDictionary('crop')
  const categoryLabel =
    categories.find((row) => row.code === item.category)?.name ?? getCategoryLabel(item.category)
  const cropLabel = item.cropCode
    ? (crops.find((row) => row.code === item.cropCode)?.name ?? item.cropCode)
    : null

  return (
    <Card
      className={onClick ? 'cursor-pointer transition-colors hover:border-primary/40' : undefined}
      onClick={onClick ? () => onClick(item) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick(item)
              }
            }
          : undefined
      }
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 text-lg font-semibold break-words text-foreground">
            {humanLabel(item.name, 'Товар')}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            {hasSyncIssue ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-600/40 text-amber-800"
                title="Офлайн-операция требует проверки"
              >
                <AlertTriangle className="size-3" />
                Проверка
              </Badge>
            ) : null}
            {critical ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                Критично
              </Badge>
            ) : null}
            {onEdit ? (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                className="size-8 shrink-0"
                aria-label="Редактировать"
                onClick={(event) => {
                  event.stopPropagation()
                  event.preventDefault()
                  onEdit(item)
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="w-fit bg-muted text-muted-foreground">
            {categoryLabel}
          </Badge>
          {isHarvestCategory(item.category) || item.isHarvest ? (
            <Badge
              variant="outline"
              className="w-fit border-primary/40 text-primary"
              title="Складской учёт урожая; KPI по культурам — в «Отгрузках урожая»"
            >
              Урожай на складе
            </Badge>
          ) : null}
          {cropLabel ? (
            <Badge variant="outline" className="w-fit bg-muted text-muted-foreground">
              {cropLabel}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-semibold text-foreground">
          {item.currentStock.toLocaleString('ru-RU')}{' '}
          <span className="text-lg font-normal text-muted-foreground">{item.unit}</span>
        </p>
        <StockProgressBar item={item} />
        <p className="text-sm text-muted-foreground">
          Мин. запас: {item.minStock.toLocaleString('ru-RU')} {item.unit}
        </p>
        {onShipmentRequest ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
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
}
