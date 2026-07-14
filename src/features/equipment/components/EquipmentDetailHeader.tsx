import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mediaUrl } from '@/lib/media'
import { meterProgress, type EquipmentDetail } from '../types'
import { ToStatusBadge } from './ToStatusBadge'

type EquipmentDetailHeaderProps = {
  item: EquipmentDetail
  canManage: boolean
  onEdit: () => void
  onMeterLog: () => void
  onMaintenance: () => void
}

export function EquipmentDetailHeader({
  item,
  canManage,
  onEdit,
  onMeterLog,
  onMaintenance,
}: EquipmentDetailHeaderProps) {
  const progress = meterProgress(item.current_meter, item.next_to_at)
  const remaining =
    item.next_to_at != null ? Math.max(0, item.next_to_at - item.current_meter) : null

  return (
    <div className="space-y-4">
      {item.image_url ? (
        <img
          src={mediaUrl(item.image_url)}
          alt={item.name}
          className="h-[100px] w-full rounded-lg object-cover"
        />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
          <div className="flex flex-wrap gap-2">
            {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
            <ToStatusBadge status={item.to_status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-lg font-semibold text-foreground">Счётчик</h2>
        <p className="text-3xl font-semibold text-foreground">
          {item.current_meter} {item.meter_label}
        </p>
        {item.next_to_at != null ? (
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }} // dynamic progress fill
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Осталось до ТО: {remaining} {item.meter_label}
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
