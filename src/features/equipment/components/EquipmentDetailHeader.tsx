import { Tractor } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AssetOperationalSummary } from '@/components/shared/AssetOperationalSummary'
import { mediaUrl } from '@/lib/media'
import {
  hoursToNextService,
  meterProgress,
  nextServiceHours,
  resolveToStatus,
  type EquipmentDetail,
} from '../types'
import { ToStatusBadge } from './ToStatusBadge'

type EquipmentDetailHeaderProps = {
  item: EquipmentDetail
  canManage: boolean
  onEdit: () => void
  onMeterLog: () => void
  onMaintenance: () => void
  onStock?: () => void
}

export function EquipmentDetailHeader({
  item,
  canManage,
  onEdit,
  onMeterLog,
  onMaintenance,
  onStock,
}: EquipmentDetailHeaderProps) {
  const progress = meterProgress(item.current_meter, item.next_to_at, item.maintenance)
  const remaining = hoursToNextService(item.current_meter, item.next_to_at, item.maintenance)
  const nextAt = nextServiceHours(item.next_to_at, item.maintenance)
  const status = resolveToStatus(item.to_status, item.maintenance)

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
            <Tractor className="size-8 opacity-50" />
          </div>
        )}

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <h1 className="text-xl font-semibold break-words text-foreground sm:text-2xl">
                {item.name}
              </h1>
              <div className="flex flex-wrap gap-2">
                {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
                <ToStatusBadge status={status} />
              </div>
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
              {canManage ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-10"
                  onClick={onMeterLog}
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
              {canManage && onStock ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-10"
                  onClick={onStock}
                >
                  Заправка / ТМЦ
                </Button>
              ) : null}
            </div>
          </div>

          <AssetOperationalSummary equipmentId={item.id} equipmentName={item.name} />

          <section className="space-y-2 rounded-lg border border-border bg-surface p-3 sm:p-4">
            <h2 className="text-base font-semibold text-foreground">Счётчик</h2>
            <p className="text-2xl font-semibold text-foreground sm:text-3xl">
              {item.current_meter} {item.meter_label}
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
                  Следующее ТО: {nextAt} {item.meter_label}
                  {remaining != null ? ` · осталось ${remaining}` : ''}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">План ТО не задан</p>
            )}
            {item.meter_type === 'shift_hours' ? (
              <p className="text-sm text-muted-foreground">
                Обновляется автоматически при закрытии смены
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
