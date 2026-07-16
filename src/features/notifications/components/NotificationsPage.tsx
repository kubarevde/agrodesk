import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks'
import {
  notificationTimeAgo,
  notificationTypeLabel,
  matchesTypeGroup,
} from '@/features/notifications/utils'
import { useOrgTimezone } from '@/features/settings/useOrgTimezone'

type ReadFilter = 'all' | 'unread'
type TypeFilter = 'all' | 'maintenance' | 'sharing'

export function NotificationsPage() {
  const navigate = useNavigate()
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
  const timezone = useOrgTimezone()

  const filtered = useMemo(
    () =>
      items.filter((item) =>
        matchesTypeGroup(
          item.type,
          typeFilter === 'all' ? undefined : typeFilter,
        ),
      ),
    [items, typeFilter],
  )

  const handleRowClick = async (id: string, link: string | null, isRead: boolean) => {
    if (!isRead) {
      await markRead.mutateAsync(id)
    }
    if (link) {
      void navigate({ to: link })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Уведомления</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Select
          value={readFilter}
          onValueChange={(value) => setReadFilter(value as ReadFilter)}
          items={[
            { value: 'all', label: 'Все' },
            { value: 'unread', label: 'Непрочитанные' },
          ]}
        >
          <SelectTrigger className="w-full sm:w-44">
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
          items={[
            { value: 'all', label: 'Все типы' },
            { value: 'maintenance', label: 'ТО' },
            { value: 'sharing', label: 'Шеринг' },
          ]}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="maintenance">ТО</SelectItem>
            <SelectItem value="sharing">Шеринг</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Уведомлений нет"
          description="Здесь появятся уведомления о ТО и заявках шеринга"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Тип</TableHead>
                <TableHead>Заголовок</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead>Время</TableHead>
                <TableHead>Прочитано</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => void handleRowClick(item.id, item.link, item.isRead)}
                >
                  <TableCell>{notificationTypeLabel(item.type)}</TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.body || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {notificationTimeAgo(item.createdAt, timezone)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isRead ? 'secondary' : 'outline'}>
                      {item.isRead ? 'Да' : 'Нет'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
