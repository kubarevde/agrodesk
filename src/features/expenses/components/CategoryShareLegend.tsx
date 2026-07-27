import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  formatMoney,
  getCategoryColor,
  type CategorySharePoint,
} from '@/features/expenses/utils'
import { cn } from '@/lib/utils'

export function CategoryChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{
    payload: { amount: number; percent: number; name: string }
  }>
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{point.name}</p>
      <p className="text-muted-foreground">
        {formatMoney(point.amount)} · {point.percent}%
      </p>
    </div>
  )
}

type LegendRow = {
  category: string
  name: string
  amount: number
  percent: number
  isOther: boolean
  fill: string
}

interface CategoryShareLegendProps {
  rows: LegendRow[]
  otherDetails: CategorySharePoint[]
  otherOpen: boolean
  onOtherOpenChange: (open: boolean) => void
  labelFn: (category: string) => string
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="size-3 shrink-0 rounded-sm bg-(--dot-color)"
      style={{ ['--dot-color' as string]: color }}
      aria-hidden
    />
  )
}

export function CategoryShareLegend({
  rows,
  otherDetails,
  otherOpen,
  onOtherOpenChange,
  labelFn,
}: CategoryShareLegendProps) {
  return (
    <ul className="space-y-1">
      {rows.map((row) => {
        if (row.isOther) {
          return (
            <li key={row.category}>
              <Popover open={otherOpen} onOpenChange={onOtherOpenChange}>
                <PopoverTrigger
                  className={cn(
                    'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left',
                    'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <ColorDot color={row.fill} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {row.name}
                    <span className="ml-1 text-muted-foreground">({otherDetails.length})</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {formatMoney(row.amount)} · {row.percent}%
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      otherOpen && 'rotate-180',
                    )}
                  />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(100vw-2rem,20rem)] p-3">
                  <p className="mb-2 text-sm font-medium text-foreground">Состав «Прочее»</p>
                  <ul className="max-h-56 space-y-1 overflow-y-auto">
                    {otherDetails.map((detail) => (
                      <li
                        key={detail.category}
                        className="flex min-h-10 items-center justify-between gap-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate text-foreground">
                          <ColorDot color={getCategoryColor(detail.category)} />
                          <span className="truncate">{labelFn(detail.category)}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatMoney(detail.amount)} · {detail.percent}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </li>
          )
        }

        return (
          <li key={row.category} className="flex min-h-11 items-center gap-2 px-2 py-2">
            <ColorDot color={row.fill} />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{row.name}</span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {formatMoney(row.amount)} · {row.percent}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
