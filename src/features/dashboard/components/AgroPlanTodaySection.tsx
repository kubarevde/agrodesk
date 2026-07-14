import { CalendarDays } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS_LABELS, type AgroPlanStatus } from '@/features/agro-calendar/types'
import { statusBadgeClass } from '@/features/agro-calendar/utils'
import type { DashboardAgroPlanToday } from '@/types'

type AgroPlanTodaySectionProps = {
  items: DashboardAgroPlanToday[]
  isLoading: boolean
}

export function AgroPlanTodaySection({ items, isLoading }: AgroPlanTodaySectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Сегодня запланировано</h2>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="py-4">
                <Skeleton className="h-5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <CalendarDays className="size-5 shrink-0" />
            Работ на сегодня не запланировано
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const status = item.status as AgroPlanStatus
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{item.fieldName}</p>
                    <p className="text-sm text-muted-foreground">{item.workTypeName}</p>
                  </div>
                  <Badge className={statusBadgeClass(status)}>
                    {STATUS_LABELS[status] ?? item.status}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
