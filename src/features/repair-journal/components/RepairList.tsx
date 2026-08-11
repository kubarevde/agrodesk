import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getPriorityBadgeClass,
  PRIORITY_LABELS,
  shouldShowRepairPriority,
} from '../lib/labels'
import type { RepairJournalEntry } from '../types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { RepairStatusBadges } from './RepairStatusBadges'

type RepairListProps = {
  items: RepairJournalEntry[]
  onOpen: (entry: RepairJournalEntry) => void
  emptyMessage?: string
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

export function RepairList({
  items,
  onOpen,
  emptyMessage = 'Нет записей ремонта. Поставьте технику или приспособление на ремонт.',
}: RepairListProps) {
  if (items.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="py-6 text-sm text-muted-foreground">{emptyMessage}</CardContent>
      </Card>
    )
  }

  return (
    <ul className="space-y-1.5">
      {items.map((entry) => (
        <li key={entry.id}>
          <Card
            role="button"
            tabIndex={0}
            className="cursor-pointer overflow-hidden shadow-none transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpen(entry)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(entry)
              }
            }}
          >
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 p-3 pb-1.5">
              <div className="min-w-[160px] space-y-0.5">
                <AssetLink entry={entry} />
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(entry.date), 'd MMM yyyy', { locale: ru })} · {entry.type}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <RepairStatusBadges status={entry.status} waitingParts={entry.waitingParts} />
                {shouldShowRepairPriority(entry) ? (
                  <Badge variant="outline" className={getPriorityBadgeClass(entry.priority)}>
                    {PRIORITY_LABELS[entry.priority] ?? entry.priority}
                  </Badge>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 p-3 pt-0">
              {entry.description ? (
                <p className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">
                  {entry.description}
                </p>
              ) : null}
              <p className="text-xs text-foreground">
                Чек-лист: {entry.checklistDone}/{entry.checklistTotal}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
