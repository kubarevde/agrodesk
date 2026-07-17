import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  getPriorityBadgeClass,
  getStatusBadgeClass,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../lib/labels'
import type { RepairJournalEntry } from '../types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

type RepairListProps = {
  items: RepairJournalEntry[]
  onOpen: (entry: RepairJournalEntry) => void
}

function AssetLink({ entry }: { entry: RepairJournalEntry }) {
  if (entry.equipmentId) {
    return (
      <Link
        to="/equipment/$equipmentId"
        params={{ equipmentId: entry.equipmentId }}
        className="text-sm font-semibold text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {entry.assetLabel}
      </Link>
    )
  }
  if (entry.implementId) {
    return (
      <Link
        to="/implements/$implementId"
        params={{ implementId: entry.implementId }}
        className="text-sm font-semibold text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {entry.assetLabel}
      </Link>
    )
  }
  return <CardTitle className="text-sm">{entry.assetLabel}</CardTitle>
}

export function RepairList({ items, onOpen }: RepairListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Нет записей ремонта. Поставьте технику или приспособление на ремонт.
        </CardContent>
      </Card>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((entry) => (
        <li key={entry.id}>
          <Card className="overflow-hidden shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2 pt-3">
              <div className="min-w-[180px] space-y-1">
                <AssetLink entry={entry} />
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(entry.date), 'd MMM yyyy', { locale: ru })} · {entry.type}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className={getStatusBadgeClass(entry.status)}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </Badge>
                <Badge variant="outline" className={getPriorityBadgeClass(entry.priority)}>
                  {PRIORITY_LABELS[entry.priority] ?? entry.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pb-3">
              {entry.description ? (
                <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">
                  {entry.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-foreground">
                  Чек-лист: {entry.checklistDone}/{entry.checklistTotal}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpen(entry)}
                  className="whitespace-nowrap"
                >
                  Открыть
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
