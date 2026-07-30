import { CloudLightning, Snowflake, Wind } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { primaryAdvisoryCode, worstAdvisorySeverity } from '../advisoryUi'
import type { WeatherAdvisory } from '../types'

type PlanWeatherAdvisoryBadgeProps = {
  advisories: WeatherAdvisory[]
  className?: string
  /** Shorter label for month-grid chips. */
  compact?: boolean
}

function advisoryIcon(code: string) {
  if (code === 'frost') return Snowflake
  if (code === 'strong_wind_spray') return Wind
  return CloudLightning
}

export function PlanWeatherAdvisoryBadge({
  advisories,
  className,
  compact = false,
}: PlanWeatherAdvisoryBadgeProps) {
  if (!advisories.length) return null

  const worst = worstAdvisorySeverity(advisories) ?? 'info'
  const Icon = advisoryIcon(primaryAdvisoryCode(advisories) ?? '')
  const label = compact
    ? worst === 'warning'
      ? 'Риск'
      : 'Погода'
    : 'Погодное предупреждение'

  return (
    <Popover>
      <PopoverTrigger
        className={cn('inline-flex max-w-full', className)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Погодное предупреждение"
        title="Погодное предупреждение"
      >
        <Badge
          variant="outline"
          className={cn(
            'max-w-full gap-1 font-medium',
            compact ? 'px-1.5 py-0 text-[10px]' : 'text-xs',
            worst === 'warning'
              ? 'border-destructive/50 bg-destructive/15 text-destructive'
              : 'border-primary/40 bg-primary/10 text-primary',
          )}
        >
          <Icon className={cn('shrink-0', compact ? 'size-3' : 'size-3.5')} />
          <span className="truncate">{label}</span>
          {!compact && advisories.length > 1 ? ` · ${advisories.length}` : null}
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 gap-3 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-foreground">Погодное предупреждение</p>
        <p className="text-xs text-muted-foreground">
          По прогнозу на даты плана (заморозки, осадки, ветер при опрыскивании).
        </p>
        <ul className="space-y-2">
          {advisories.map((item) => {
            const ItemIcon = advisoryIcon(item.code)
            return (
              <li
                key={`${item.code}-${item.date}-${item.message}`}
                className="space-y-1 rounded-md border border-border/60 bg-muted/20 p-2"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                  <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  {item.title}
                  <span
                    className={cn(
                      'rounded px-1 text-[10px] font-medium uppercase',
                      item.severity === 'warning'
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-primary/10 text-primary',
                    )}
                  >
                    {item.severity === 'warning' ? 'важно' : 'сведения'}
                  </span>
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
