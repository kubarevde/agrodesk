import { Link, useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCount,
  useNotifications,
} from './hooks'
import type { NotificationItem } from './types'
import {
  notificationTimeAgo,
  notificationTypeIcon,
  notificationTypeLabel,
} from './utils'

export function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useNotificationCount()
  const { data: items = [], isLoading } = useNotifications({ limit: 10 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const handleClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markRead.mutateAsync(item.id)
    }
    setOpen(false)
    if (item.link) {
      void navigate({ to: item.link })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
        aria-label="Уведомления"
      >
        <Bell className="size-5 text-foreground" />
        {unread > 0 ? (
          <Badge className="absolute -top-0.5 -right-0.5 min-h-5 min-w-5 justify-center border-0 bg-amber-600 px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm">
            {unread > 99 ? '99+' : unread}
          </Badge>
        ) : null}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="font-semibold text-foreground">Уведомления</p>
          {unread > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Отметить все
            </Button>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Нет уведомлений</p>
          ) : (
            items.map((item) => (
              <NotificationPopoverItem key={item.id} item={item} onClick={() => handleClick(item)} />
            ))
          )}
        </div>

        <div className="border-t border-border px-3 py-2">
          <Link
            to="/notifications"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Все уведомления →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationPopoverItem({
  item,
  onClick,
}: {
  item: NotificationItem
  onClick: () => void
}) {
  const Icon = notificationTypeIcon(item.type)

  return (
    <button
      type="button"
      className={cn(
        'flex w-full gap-2 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/60',
        !item.isRead && 'border-l-2 border-l-primary bg-primary/5',
      )}
      onClick={onClick}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        {item.body ? (
          <p className="truncate text-xs text-muted-foreground">{item.body}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {notificationTimeAgo(item.createdAt)}
        </p>
      </div>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {notificationTypeLabel(item.type)}
      </span>
    </button>
  )
}
