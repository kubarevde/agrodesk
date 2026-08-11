import { getProgressBarColor, getStockPercent } from '@/features/inventory/utils'
import type { InventoryItem } from '@/types'
import { cn } from '@/lib/utils'

interface StockProgressBarProps {
  item: InventoryItem
  /** Tighter bar for dense mobile cards. */
  compact?: boolean
}

export function StockProgressBar({ item, compact = false }: StockProgressBarProps) {
  const percent = getStockPercent(item)
  const color = getProgressBarColor(percent)

  return (
    <div className={cn(compact ? 'space-y-0.5' : 'space-y-1')}>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted',
          compact ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <p
        className={cn(
          'text-muted-foreground',
          compact ? 'text-[10px]' : 'text-xs',
        )}
      >
        {percent}% от ёмкости
      </p>
    </div>
  )
}
