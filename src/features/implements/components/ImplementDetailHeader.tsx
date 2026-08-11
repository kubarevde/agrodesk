import { Wrench } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AssetOperationalSummary } from '@/components/shared/AssetOperationalSummary'
import { ToStatusBadge } from '@/features/equipment/components/ToStatusBadge'
import {
  hoursToNextService,
  meterProgress,
  nextServiceHours,
} from '@/features/equipment/types'
import { mediaUrl } from '@/lib/media'
import { implementToStatus, type ImplementResponse } from '../types'
import { ImplementCategoryBadge } from './ImplementCategoryBadge'

type ImplementDetailHeaderProps = {
  item: ImplementResponse
  canManage: boolean
  onEdit: () => void
  onMaintenance: () => void
  onUsageLog?: () => void
}

export function ImplementDetailHeader({
  item,
  canManage,
  onEdit,
  onMaintenance,
  onUsageLog,
}: ImplementDetailHeaderProps) {
  const progress = meterProgress(
    item.current_usage_hours,
    item.next_service_hours,
    item.maintenance,
  )
  const remaining = hoursToNextService(
    item.current_usage_hours,
    item.next_service_hours,
    item.maintenance,
  )
  const nextAt = nextServiceHours(item.next_service_hours, item.maintenance)
  const status = implementToStatus(item)

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start">
        {item.image_url ? (
          <div className="flex max-h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-muted lg:max-h-56">
            <img
              src={mediaUrl(item.image_url)}
              alt={item.name}
              className="max-h-48 w-full object-contain lg:max-h-56"
            />
          </div>
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-lg bg-muted text-muted-foreground lg:h-40">
            <Wrench className="size-8 opacity-50" />
          </div>
        )}

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-semibold break-words text-foreground sm:text-2xl">
                {item.name}
              </h1>
              <div className="flex flex-wrap gap-2">
                <ImplementCategoryBadge category={item.category} />
                <ToStatusBadge status={status} />
              </div>
              {item.current_equipment_id && item.current_equipment_name ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/equipment/$equipmentId"
                    params={{ equipmentId: item.current_equipment_id }}
                    className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 sm:min-h-10')}
                  >
                    Открыть технику
                  </Link>
                  <span className="text-sm text-foreground">{item.current_equipment_name}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Свободно</p>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-10"
                  onClick={onEdit}
                >
                  Редактировать
                </Button>
              ) : null}
              {canManage && onUsageLog ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-10"
                  onClick={onUsageLog}
                >
                  Внести показания
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-10"
                  onClick={onMaintenance}
                >
                  Записать ТО
                </Button>
              ) : null}
            </div>
          </div>

          <AssetOperationalSummary implementId={item.id} implementName={item.name} />

          <section className="space-y-2 rounded-lg border border-border bg-surface p-3 sm:p-4">
            <h2 className="text-base font-semibold text-foreground">Наработка</h2>
            <p className="text-2xl font-semibold text-foreground sm:text-3xl">
              {item.current_usage_hours} ч
            </p>
            {nextAt != null ? (
              <div className="space-y-1.5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Следующее ТО: {nextAt} ч
                  {remaining != null ? ` · осталось ${remaining}` : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">План ТО не задан</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
