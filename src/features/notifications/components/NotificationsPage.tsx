import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useOrgTimezone } from '@/features/settings/useOrgTimezone'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks'
import type { NotificationTypeGroup } from '@/features/notifications/types'
import {
  matchesTypeGroup,
  NOTIFICATION_TYPE_FILTER_OPTIONS,
} from '@/features/notifications/utils'
import { NotificationListItem } from './NotificationListItem'
import { NotificationsDesktopTable } from './NotificationsDesktopTable'

type ReadFilter = 'all' | 'unread'
type TypeFilter = 'all' | NotificationTypeGroup

export function NotificationsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile(639)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const apiFilters = useMemo(
    () => ({
      isRead: readFilter === 'unread' ? false : undefined,
      limit: 100,
    }),
    [readFilter],
  )

  const { data: items = [], isLoading } = useNotifications(apiFilters)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const timezone = useOrgTimezone()

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        matchesTypeGroup(item.type, typeFilter === 'all' ? undefined : typeFilter),
      ),
    [items, typeFilter],
  )

  const unreadVisible = useMemo(
    () => filtered.some((item) => !item.isRead),
    [filtered],
  )

  const handleOpen = async (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) {
      await markRead.mutateAsync(id)
    }
    if (link) {
      void navigate({ to: link })
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Уведомления</h1>
        {unreadVisible ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:min-h-9 sm:w-auto"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Отметить все прочитанными
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
        <Select
          value={readFilter}
          onValueChange={(value) => setReadFilter(value as ReadFilter)}
          items={[
            { value: 'all', label: 'Все' },
            { value: 'unread', label: 'Непрочитанные' },
          ]}
        >
          <SelectTrigger className="min-h-11 w-full sm:min-h-9 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="unread">Непрочитанные</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          items={NOTIFICATION_TYPE_FILTER_OPTIONS}
        >
          <SelectTrigger className="min-h-11 w-full sm:min-h-9 sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TYPE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Уведомлений нет"
          description="Здесь появятся уведомления о ТО, шеринге, поддержке и других событиях"
        />
      ) : isMobile ? (
        <ul className="space-y-2.5">
          {filtered.map((item) => (
            <li key={item.id}>
              <NotificationListItem
                item={item}
                timezone={timezone}
                onClick={() => void handleOpen(item.id, item.link, item.isRead)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <NotificationsDesktopTable
          items={filtered}
          timezone={timezone}
          onOpen={(id, link, isRead) => void handleOpen(id, link, isRead)}
        />
      )}
    </div>
  )
}
