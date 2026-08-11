import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useOrgTimezone } from '@/features/settings/useOrgTimezone'
import { cn } from '@/lib/utils'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCount,
  useNotifications,
} from './hooks'
import type { NotificationItem } from './types'
import { NotificationBellPanel } from './components/NotificationBellPanel'

const triggerClassName =
  'relative inline-flex items-center justify-center rounded-lg text-foreground hover:bg-muted active:bg-muted'

export function NotificationBell() {
  const navigate = useNavigate()
  const timezone = useOrgTimezone()
  const isMobile = useIsMobile(639)
  const [open, setOpen] = useState(false)
  const { data: unread = 0 } = useNotificationCount()
  const { data: items = [], isLoading } = useNotifications({ limit: 10 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await markRead.mutateAsync(item.id)
    }
    setOpen(false)
    const link = item.link
    if (link) {
      window.setTimeout(() => {
        void navigate({ to: link })
      }, 0)
    }
  }

  const panel = (
    <NotificationBellPanel
      items={items}
      timezone={timezone}
      isLoading={isLoading}
      unread={unread}
      markAllPending={markAllRead.isPending}
      onMarkAll={() => markAllRead.mutate()}
      onItemClick={(item) => void handleItemClick(item)}
      onClose={() => setOpen(false)}
      mobile={isMobile}
    />
  )

  const badge =
    unread > 0 ? (
      <Badge className="absolute -top-0.5 -right-0.5 min-h-5 min-w-5 pointer-events-none justify-center border-0 bg-amber-600 px-1.5 text-[11px] font-semibold leading-none text-white shadow-sm">
        {unread > 99 ? '99+' : unread}
      </Badge>
    ) : null

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className={cn(triggerClassName, 'size-11')}
          aria-label="Уведомления"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Bell className="size-5" />
          {badge}
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
            showCloseButton={false}
          >
            <div
              className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30"
              aria-hidden
            />
            <SheetHeader className="sr-only">
              <SheetTitle>Уведомления</SheetTitle>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(triggerClassName, 'size-9')}
        aria-label="Уведомления"
      >
        <Bell className="size-5" />
        {badge}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 gap-0 p-0">
        {panel}
      </PopoverContent>
    </Popover>
  )
}
