import { getProgressBarColor, getStockPercent } from '@/features/inventory/utils'
import type { InventoryItem } from '@/types'

interface StockProgressBarProps {
  item: InventoryItem
}

export function StockProgressBar({ item }: StockProgressBarProps) {
  const percent = getStockPercent(item)
  const color = getProgressBarColor(percent)

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{percent}% от ёмкости</p>
    </div>
  )
}
