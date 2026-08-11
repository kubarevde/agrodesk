import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { NotificationItem } from '../types'
import { notificationTimeAgo, notificationTypeLabel } from '../utils'

type NotificationsDesktopTableProps = {
  items: NotificationItem[]
  timezone: string
  onOpen: (id: string, link: string | null, isRead: boolean) => void
}

export function NotificationsDesktopTable({
  items,
  timezone,
  onOpen,
}: NotificationsDesktopTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Тип</TableHead>
            <TableHead>Заголовок</TableHead>
            <TableHead>Сообщение</TableHead>
            <TableHead>Время</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => onOpen(item.id, item.link, item.isRead)}
            >
              <TableCell>{notificationTypeLabel(item.type)}</TableCell>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell className="max-w-xs truncate">{item.body || '—'}</TableCell>
              <TableCell className="whitespace-nowrap">
                {notificationTimeAgo(item.createdAt, timezone)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={item.isRead ? 'secondary' : 'outline'}
                  className={
                    item.isRead
                      ? undefined
                      : 'border-amber-600/40 bg-amber-400/90 text-amber-950'
                  }
                >
                  {item.isRead ? 'Прочитано' : 'Новое'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
