import { Link } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardShipmentRequestsSummary } from '@/types'

type Props = {
  summary: DashboardShipmentRequestsSummary
  isLoading: boolean
}

export function ShipmentRequestsSummarySection({ summary, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-36 w-full rounded-xl" />

  const total =
    summary.today + summary.upcoming + summary.overdue + summary.urgent

  return (
    <Card data-testid="dashboard-shipment-requests">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="size-4 text-primary" />
          Заявки на отгрузку
          {summary.urgent > 0 || summary.overdue > 0 ? (
            <Badge variant="destructive" className="ml-1">
              {summary.urgent + summary.overdue}
            </Badge>
          ) : null}
        </CardTitle>
        <Link
          to="/shipment-requests"
          search={{ focus: 'active', createItemId: undefined }}
          className="text-sm text-primary hover:underline"
          data-testid="dashboard-shipment-requests-link"
        >
          Открыть
        </Link>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {total === 0 ? (
          <p className="text-muted-foreground">Активных заявок нет</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            <li className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="text-xs text-muted-foreground">Сегодня</p>
              <p className="font-medium text-foreground">{summary.today}</p>
            </li>
            <li className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="text-xs text-muted-foreground">Ближайшие дни</p>
              <p className="font-medium text-foreground">{summary.upcoming}</p>
            </li>
            <li className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="text-xs text-muted-foreground">Просрочено</p>
              <p className="font-medium text-foreground">{summary.overdue}</p>
            </li>
            <li className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="text-xs text-muted-foreground">Срочные</p>
              <p className="font-medium text-foreground">{summary.urgent}</p>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
