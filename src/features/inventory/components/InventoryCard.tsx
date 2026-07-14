import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { InventoryItem } from '@/types'
import { getCategoryLabel, isCriticalStock } from '@/features/inventory/utils'
import { StockProgressBar } from './StockProgressBar'

interface InventoryCardProps {
  item: InventoryItem
  onClick?: (item: InventoryItem) => void
}

export function InventoryCard({ item, onClick }: InventoryCardProps) {
  const critical = isCriticalStock(item)

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
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
          {critical ? (
            <Badge variant="destructive" className="shrink-0 gap-1">
              <AlertTriangle className="size-3" />
              Критично
            </Badge>
          ) : null}
        </div>
        <Badge variant="outline" className="w-fit bg-muted text-muted-foreground">
          {getCategoryLabel(item.category)}
        </Badge>
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
      </CardContent>
    </Card>
  )
}
