import { Check, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ITEM_TYPE_LABELS } from '../lib/labels'
import type { ChecklistItem } from '../types'

type RepairChecklistRowProps = {
  item: ChecklistItem
  onToggle: (isDone: boolean) => void
  onToPlanner?: () => void
  toPlannerPending?: boolean
}

export function RepairChecklistRow({
  item,
  onToggle,
  onToPlanner,
  toPlannerPending = false,
}: RepairChecklistRowProps) {
  const showPlanner = item.itemType === 'buy' && !item.isDone && onToPlanner

  return (
    <li>
      <div
        role="checkbox"
        aria-checked={item.isDone}
        tabIndex={0}
        className={cn(
          'flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left transition-colors',
          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          item.isDone && 'bg-muted/20',
        )}
        onClick={() => onToggle(!item.isDone)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggle(!item.isDone)
          }
        }}
      >
        <span
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
            item.isDone
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background',
          )}
          aria-hidden
        >
          {item.isDone ? <Check className="size-3.5 stroke-[3]" /> : null}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p
            className={cn(
              'text-sm leading-snug text-foreground sm:text-[15px]',
              item.isDone && 'line-through opacity-70',
            )}
          >
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
          {showPlanner ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              disabled={toPlannerPending}
              onClick={(event) => {
                event.stopPropagation()
                onToPlanner()
              }}
            >
              <ShoppingCart className="mr-1 size-3.5" />
              В планировщик
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}
