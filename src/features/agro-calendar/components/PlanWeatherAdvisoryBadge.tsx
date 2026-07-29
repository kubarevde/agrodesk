import { CloudLightning, Snowflake, Wind } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { WeatherAdvisory } from '../types'

type PlanWeatherAdvisoryBadgeProps = {
  advisories: WeatherAdvisory[]
  className?: string
}

function advisoryIcon(code: string) {
  if (code === 'frost') return Snowflake
  if (code === 'strong_wind_spray') return Wind
  return CloudLightning
}

export function PlanWeatherAdvisoryBadge({
  advisories,
  className,
}: PlanWeatherAdvisoryBadgeProps) {
  if (!advisories.length) return null

  const worst = advisories.some((a) => a.severity === 'warning') ? 'warning' : 'info'
  const Icon = advisoryIcon(advisories[0]?.code ?? '')

  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-flex', className)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Погодные предупреждения"
      >
        <Badge
          variant="outline"
          className={cn(
            'gap-1 font-normal',
            worst === 'warning'
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-primary/30 bg-primary/10 text-primary',
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          Погода
          {advisories.length > 1 ? ` · ${advisories.length}` : ''}
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 gap-3 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-foreground">Погодные риски</p>
        <ul className="space-y-2">
          {advisories.map((item) => {
            const ItemIcon = advisoryIcon(item.code)
            return (
              <li
                key={`${item.code}-${item.date}-${item.message}`}
                className="space-y-1"
              >
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  {item.title}
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.date}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.message}</p>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
