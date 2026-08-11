import { cn } from '@/lib/utils'
import { formatUnread } from '../utils'

interface UnreadBadgeProps {
  count: number
  className?: string
  /** data attribute for tests */
  'data-testid'?: string
}

export function UnreadBadge({ count, className, 'data-testid': testId }: UnreadBadgeProps) {
  if (count <= 0) return null
  return (
    <span
      data-testid={testId ?? 'unread-badge'}
      data-count={count}
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-md bg-amber-600 px-1.5 text-xs font-semibold text-white',
        className,
      )}
    >
      {formatUnread(count)}
    </span>
  )
}
