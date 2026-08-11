import { Link } from '@tanstack/react-router'
import { Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveRepairs } from '../hooks'
import { getPriorityBadgeClass, PRIORITY_LABELS } from '../lib/labels'
import { RepairStatusBadges } from './RepairStatusBadges'

export function ActiveRepairsWidget() {
  const { data, isLoading } = useActiveRepairs()

  if (isLoading) return <Skeleton className="h-28 w-full rounded-xl" />

  const count = data?.count ?? 0
  const items = data?.items ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3 pb-1.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Wrench className="size-3.5 text-primary" />
          Техника на ремонте
        </CardTitle>
        <Link to="/maintenance" className="text-xs text-primary hover:underline">
          Журнал
        </Link>
      </CardHeader>
      <CardContent className="space-y-1.5 px-4 pb-3 text-sm">
        <p>
          Сейчас в ремонте:{' '}
          <span className="font-semibold text-foreground">{count}</span>
        </p>
        {items.length === 0 ? (
          <p className="text-muted-foreground">Нет активных ремонтов</p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground">{item.assetLabel}</span>
                <div className="flex flex-wrap gap-1">
                  <RepairStatusBadges status={item.status} waitingParts={item.waitingParts} />
                  <Badge variant="outline" className={getPriorityBadgeClass(item.priority)}>
                    {PRIORITY_LABELS[item.priority] ?? item.priority}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
