import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mediaUrl } from '@/lib/media'
import { Tractor } from 'lucide-react'
import { EntityHistoryButton } from '@/features/audit-log/components/EntityHistoryButton'
import {
  hoursToNextService,
  meterProgress,
  nextServiceHours,
  resolveToStatus,
  type EquipmentDetail,
} from '../types'
import { ToStatusBadge } from './ToStatusBadge'
import { AssetOperationalSummary } from '@/components/shared/AssetOperationalSummary'

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
    <div className="space-y-4">
      {item.image_url ? (
        <div className="flex max-h-56 w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
          <img
            src={mediaUrl(item.image_url)}
            alt={item.name}
            className="max-h-56 w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Tractor className="size-8 opacity-50" />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
          <div className="flex flex-wrap gap-2">
            {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
            <ToStatusBadge status={status} />
          </div>
          <AssetOperationalSummary equipmentId={item.id} equipmentName={item.name} />
        </div>
        <div className="flex flex-wrap gap-2">
          <EntityHistoryButton entityType="equipment" entityId={item.id} />
          {canManage ? (
            <Button type="button" variant="outline" onClick={onEdit}>
              Редактировать
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" variant="outline" onClick={onMeterLog}>
              Внести показания
            </Button>
          ) : null}
          {canManage ? (
            <Button type="button" variant="outline" onClick={onMaintenance}>
              Записать ТО
            </Button>
          ) : null}
          {canManage && onStock ? (
            <Button type="button" variant="outline" onClick={onStock}>
              Заправка / ТМЦ
            </Button>
          ) : null}
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Счётчик</h2>
        <p className="text-3xl font-semibold text-foreground">
          {item.current_meter} {item.meter_label}
        </p>
        {nextAt != null ? (
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }} // dynamic progress fill
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
  )
}
