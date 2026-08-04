import { Ban, HardHat, Pencil, Share2, Tractor } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssetOperationalStatus } from '@/components/shared/AssetOperationalStatus'
import { AssetPurchasePlannerHint } from '@/components/shared/AssetPurchasePlannerHint'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import type { ImplementResponse } from '@/features/implements/types'
import { mediaUrl } from '@/lib/media'
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
  const navigate = useNavigate()
  const progress = meterProgress(item.current_meter, item.next_to_at, item.maintenance)
  const nextAt = nextServiceHours(item.next_to_at, item.maintenance)
  const remaining = hoursToNextService(item.current_meter, item.next_to_at, item.maintenance)
  const status = resolveToStatus(item.to_status, item.maintenance)
  const visible = attached.slice(0, 3)
  const extra = attached.length - visible.length

  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = []
    if (canManage) {
      list.push({
        id: 'edit',
        label: 'Редактировать',
        icon: Pencil,
        onSelect: () => onEdit(item),
      })
      list.push({
        id: 'share',
        label: 'Шеринг',
        icon: Share2,
        onSelect: () => onShare(item),
      })
    }
    if (canDeactivate && item.is_active) {
      list.push({
        id: 'deactivate',
        label: 'Деактивировать',
        icon: Ban,
        variant: 'destructive',
        onSelect: () => onDeactivate(item),
      })
    }
    return list
  }, [canDeactivate, canManage, item, onDeactivate, onEdit, onShare])

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
      data-testid="equipment-card"
      role="link"
      tabIndex={0}
      onClick={() => onDetails(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onDetails(item)
        }
      }}
    >
      {item.image_url ? (
        <div className="flex h-28 w-full items-center justify-center bg-muted sm:h-32">
          <img
            src={mediaUrl(item.image_url)}
            alt={item.name}
            className="max-h-28 w-full object-contain sm:max-h-32"
          />
        </div>
      ) : (
        <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground sm:h-28">
          <Tractor className="size-8 opacity-50" />
        </div>
      )}

      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 text-lg font-semibold leading-snug break-words text-foreground">
            {item.name}
          </CardTitle>
          {actions.length > 0 ? <CardActionsMenu actions={actions} title={item.name} /> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
          <ToStatusBadge status={status} />
          <AssetOperationalStatus equipmentId={item.id} compact showPurchases={false} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="space-y-1">
          {nextAt != null ? (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {item.current_meter} {item.meter_label} → {nextAt} {item.meter_label}
                {remaining != null ? ` (осталось ${remaining})` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium tabular-nums text-foreground">
              {item.current_meter} {item.meter_label}
            </p>
          )}
          {item.meter_type === 'shift_hours' ? (
            <p className="hidden text-xs text-muted-foreground sm:block">Автозапись из смен</p>
          ) : null}
        </div>

        {attached.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((row) => (
              <Badge key={row.id} variant="outline" className="max-w-full truncate">
                {row.name}
              </Badge>
            ))}
            {extra > 0 ? (
              <Badge variant="outline" className="text-muted-foreground">
                +{extra} ещё
              </Badge>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Без приспособлений</p>
        )}

        <AssetPurchasePlannerHint equipmentId={item.id} />

        <div
          className="mt-auto"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:min-h-10"
            onClick={() => {
              void navigate({
                to: '/maintenance',
                search: { equipmentId: item.id },
              })
            }}
          >
            <HardHat className="size-4" />
            Ремонт и обслуживание
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
