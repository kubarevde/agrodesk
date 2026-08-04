import { Badge } from '@/components/ui/badge'
import { useDictionary } from '@/features/dictionaries/hooks'
import { cn } from '@/lib/utils'
import { findDictionaryCategory, getImplementCategoryConfig } from '../categoryConfig'

type ImplementCategoryBadgeProps = {
  category: string
  className?: string
}

export function ImplementCategoryBadge({ category, className }: ImplementCategoryBadgeProps) {
  const { data: dictionary = [] } = useDictionary('implement_category')
  const dictItem = findDictionaryCategory(category, dictionary)
  const config = getImplementCategoryConfig(category, dictItem)
  const Icon = config.icon

  return (
    <Badge variant="outline" className={cn('gap-1', config.badgeClass, className)}>
      <Icon className="size-3.5" aria-hidden />
      {config.label}
    </Badge>
  )
}
