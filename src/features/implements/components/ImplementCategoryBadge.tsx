import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getImplementCategoryConfig } from '../categoryConfig'

type ImplementCategoryBadgeProps = {
  category: string
  className?: string
}

export function ImplementCategoryBadge({ category, className }: ImplementCategoryBadgeProps) {
  const config = getImplementCategoryConfig(category)
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn('gap-1', config.badgeClass, className)}>
      <Icon className="size-3.5" aria-hidden />
      {config.label}
    </Badge>
  )
}
