import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getImplementConditionConfig } from '../categoryConfig'

type ImplementConditionBadgeProps = {
  condition: string
  className?: string
}

export function ImplementConditionBadge({ condition, className }: ImplementConditionBadgeProps) {
  const config = getImplementConditionConfig(condition)
  const Icon = config.icon

  return (
    <Badge className={cn('gap-1', config.badgeClass, className)}>
      <Icon className="size-3.5" aria-hidden />
      {config.label}
    </Badge>
  )
}
