import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '../types'
import {
  notificationTimeAgo,
  notificationTypeIcon,
  notificationTypeLabel,
} from '../utils'

type NotificationListItemProps = {
  item: NotificationItem
  timezone: string
  onClick: () => void
  /** Compact row for header popover / sheet. */
  compact?: boolean
  className?: string
}

export function NotificationListItem({
  item,
  timezone,
  onClick,
  compact = false,
  className,
}: NotificationListItemProps) {
  const Icon = notificationTypeIcon(item.type)

  if (compact) {
    return (
      <button
        type="button"
        className={cn(
          'flex min-h-12 w-full gap-2.5 border-b border-border px-3 py-3 text-left last:border-b-0 hover:bg-muted/60 active:bg-muted',
          !item.isRead && 'border-l-2 border-l-primary bg-primary/5',
          className,
        )}
        onClick={onClick}
      >
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
              {item.title}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {notificationTypeLabel(item.type)}
            </span>
          </div>
          {item.body ? (
            <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{item.body}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {notificationTimeAgo(item.createdAt, timezone)}
          </p>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cn(
        'flex min-h-[4.5rem] w-full gap-3 rounded-lg border border-border bg-surface p-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60 sm:p-4',
        !item.isRead && 'border-primary/40 bg-primary/5',
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted',
          !item.isRead && 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
            {notificationTypeLabel(item.type)}
          </Badge>
          <Badge
            variant={item.isRead ? 'secondary' : 'outline'}
            className={cn(
              'px-1.5 py-0 text-[11px]',
              !item.isRead &&
                'border-amber-600/40 bg-amber-400/90 text-amber-950',
            )}
          >
            {item.isRead ? 'Прочитано' : 'Новое'}
          </Badge>
        </div>
        <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
          {item.title}
        </p>
        {item.body ? (
          <p className="line-clamp-3 text-sm leading-snug text-muted-foreground">{item.body}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {notificationTimeAgo(item.createdAt, timezone)}
        </p>
      </div>
    </button>
  )
}
