import { CheckCircle2, Wrench } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toStatusClass, toStatusLabel, type ToStatus } from '@/features/equipment/types'
import type { DashboardEquipmentWarning } from '@/types'
import { cn } from '@/lib/utils'

type EquipmentWarningsSectionProps = {
  items: DashboardEquipmentWarning[]
  isLoading: boolean
}

function remainingLabel(item: DashboardEquipmentWarning): string {
  if (item.nextToAt == null) return '—'
  const left = Math.round((item.nextToAt - item.currentMeter) * 10) / 10
  return `Осталось: ${left} ${item.meterLabel}`
}

export function EquipmentWarningsSection({ items, isLoading }: EquipmentWarningsSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-foreground">Скоро ТО / Техника</h2>
        <Link to="/equipment" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Управление техникой →
        </Link>
      </div>

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
          <CardContent className="flex items-center gap-3 py-6 text-sm text-success">
            <CheckCircle2 className="size-5 shrink-0" />
            Вся техника в норме
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <Wrench className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Счётчик: {item.currentMeter.toLocaleString('ru-RU')} {item.meterLabel}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <p className="text-sm text-muted-foreground">{remainingLabel(item)}</p>
                  <Badge className={toStatusClass(item.toStatus as ToStatus)}>
                    {toStatusLabel(item.toStatus as ToStatus)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
