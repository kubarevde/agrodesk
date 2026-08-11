import { Ban, Pencil, Share2, Tractor } from 'lucide-react'
import { useMemo, useRef, type SyntheticEvent } from 'react'
import { Badge } from '@/components/ui/badge'
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
  const suppressNavRef = useRef(false)
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

  const openDetails = () => {
    if (suppressNavRef.current) return
    onDetails(item)
  }

  const stopCardNav = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
      data-testid="equipment-card"
      role="link"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetails()
        }
      }}
    >
      {item.image_url ? (
        <div className="flex h-24 w-full items-center justify-center bg-muted sm:h-32">
          <img
            src={mediaUrl(item.image_url)}
            alt={item.name}
            className="max-h-24 w-full object-contain sm:max-h-32"
          />
        </div>
      ) : (
        <div className="flex h-20 w-full items-center justify-center bg-muted text-muted-foreground sm:h-28">
          <Tractor className="size-7 opacity-50 sm:size-8" />
        </div>
      )}

      <CardHeader className="space-y-2 p-3 pb-2 sm:p-4 sm:pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 text-base font-semibold leading-snug break-words text-foreground sm:text-lg">
            {item.name}
          </CardTitle>
          <CardActionsMenu
            actions={actions}
            title={item.name}
            onOpenChange={(menuOpen) => {
              if (!menuOpen) {
                suppressNavRef.current = true
                window.setTimeout(() => {
                  suppressNavRef.current = false
                }, 400)
              }
            }}
          />
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5"
          onClick={stopCardNav}
          onKeyDown={stopCardNav}
        >
          {item.type ? <Badge variant="secondary">{item.type}</Badge> : null}
          <ToStatusBadge status={status} />
          <AssetOperationalStatus equipmentId={item.id} compact showPurchases={false} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2 p-3 pt-0 sm:gap-3 sm:p-4 sm:pt-0">
        <div className="space-y-1">
          {nextAt != null ? (
            <>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="tabular-nums">
                  {item.current_meter} {item.meter_label}
                  <span className="text-muted-foreground/80"> → </span>
                  {nextAt} {item.meter_label}
                </p>
                {remaining != null ? (
                  <p className="mt-0.5">Осталось {remaining}</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm font-medium tabular-nums text-foreground">
              {item.current_meter} {item.meter_label}
            </p>
          )}
          {item.meter_type === 'shift_hours' ? (
            <p className="text-xs text-muted-foreground">Автозапись из смен</p>
          ) : null}
        </div>

        {attached.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visible.map((row) => (
              <Badge key={row.id} variant="outline" className="max-w-[11rem] truncate sm:max-w-full">
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

        <AssetPurchasePlannerHint
          equipmentId={item.id}
          linkLabel="Открыть закупки"
          className="px-2.5 py-1.5"
        />
      </CardContent>
    </Card>
  )
}
