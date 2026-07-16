import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ImplementResponse } from '@/features/implements/types'
import { mediaUrl } from '@/lib/media'
import { Tractor } from 'lucide-react'
import {
  hoursToNextService,
  meterProgress,
  nextServiceHours,
  resolveToStatus,
  type EquipmentDetail,
} from '../types'
import { ToStatusBadge } from './ToStatusBadge'

type EquipmentCardProps = {
  item: EquipmentDetail
  implements: ImplementResponse[]
  canManage: boolean
  canDeactivate: boolean
  onDetails: (item: EquipmentDetail) => void
  onEdit: (item: EquipmentDetail) => void
  onShare: (item: EquipmentDetail) => void
  onDeactivate: (item: EquipmentDetail) => void
}

export function EquipmentCard({
  item,
  implements: attached,
  canManage,
  canDeactivate,
  onDetails,
  onEdit,
  onShare,
  onDeactivate,
}: EquipmentCardProps) {
  const progress = meterProgress(item.current_meter, item.next_to_at, item.maintenance)
  const nextAt = nextServiceHours(item.next_to_at, item.maintenance)
  const remaining = hoursToNextService(item.current_meter, item.next_to_at, item.maintenance)
  const status = resolveToStatus(item.to_status, item.maintenance)
  const visible = attached.slice(0, 3)
  const extra = attached.length - visible.length

  return (
    <Card className="flex flex-col overflow-hidden">
      {item.image_url ? (
        <div className="flex h-40 w-full items-center justify-center bg-muted">
          <img
            src={mediaUrl(item.image_url)}
            alt={item.name}
            className="max-h-40 w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-muted text-muted-foreground">
          <Tractor className="size-10 opacity-50" />
        </div>
      )}
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold text-foreground">{item.name}</CardTitle>
          {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
        </div>
        <ToStatusBadge status={status} />

        {nextAt != null ? (
          <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progress}%` }} // dynamic width for progress fill
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {item.current_meter} {item.meter_label} → {nextAt} {item.meter_label}
              {remaining != null ? ` (осталось ${remaining})` : ''}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {item.current_meter} {item.meter_label}
          </p>
        )}

        {item.meter_type === 'shift_hours' ? (
          <p className="text-xs text-muted-foreground">Автозапись из смен</p>
        ) : null}

        {attached.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((row) => (
              <Badge key={row.id} variant="outline">
                {row.name}
              </Badge>
            ))}
            {extra > 0 ? (
              <Badge variant="outline" className="text-muted-foreground">
                +{extra} ещё
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="mt-auto flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => onDetails(item)}>
          Детали
        </Button>
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(item)}>
            Редактировать
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onShare(item)}>
            Шеринг
          </Button>
        ) : null}
        {canDeactivate && item.is_active ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => onDeactivate(item)}
          >
            Деактивировать
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
