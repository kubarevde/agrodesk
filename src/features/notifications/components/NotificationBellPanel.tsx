import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '../types'
import { NotificationListItem } from './NotificationListItem'

type NotificationBellPanelProps = {
  items: NotificationItem[]
  timezone: string
  isLoading: boolean
  unread: number
  markAllPending: boolean
  onMarkAll: () => void
  onItemClick: (item: NotificationItem) => void
  onClose: () => void
  /** Larger rows / footer for bottom sheet. */
  mobile?: boolean
}

export function NotificationBellPanel({
  items,
  timezone,
  isLoading,
  unread,
  markAllPending,
  onMarkAll,
  onItemClick,
  onClose,
  mobile = false,
}: NotificationBellPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex shrink-0 items-center justify-between gap-2 border-b border-border',
          mobile ? 'min-h-12 px-4 py-3' : 'min-h-11 px-3 py-2',
        )}
      >
        <p
          className={cn(
            'font-semibold text-foreground',
            mobile ? 'text-base' : 'text-sm',
          )}
        >
          Уведомления
        </p>
        {unread > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('shrink-0 px-2', mobile ? 'min-h-11' : 'min-h-8')}
            disabled={markAllPending}
            onClick={onMarkAll}
          >
            Отметить все
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          mobile ? 'max-h-[min(65vh,28rem)]' : 'max-h-80',
        )}
      >
        {isLoading ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Нет уведомлений</p>
        ) : (
          items.map((item) => (
            <NotificationListItem
              key={item.id}
              item={item}
              timezone={timezone}
              compact
              className={mobile ? 'px-4' : undefined}
              onClick={() => onItemClick(item)}
            />
          ))
        )}
      </div>

      <div
        className={cn(
          'shrink-0 border-t border-border',
          mobile ? 'px-4 py-3' : 'px-3 py-2',
        )}
      >
        <Link
          to="/notifications"
          className={cn(
            'inline-flex w-full items-center font-medium text-primary hover:underline',
            mobile ? 'min-h-11 text-base' : 'min-h-9 text-sm',
          )}
          onClick={onClose}
        >
          Все уведомления →
        </Link>
      </div>
    </div>
  )
}
