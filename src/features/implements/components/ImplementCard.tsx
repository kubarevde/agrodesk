import {
  Link2,
  Link2Off,
  Pencil,
  Share2,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AssetOperationalStatus } from '@/components/shared/AssetOperationalStatus'
import { AssetPurchasePlannerHint } from '@/components/shared/AssetPurchasePlannerHint'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import { ToStatusBadge } from '@/features/equipment/components/ToStatusBadge'
import {
  hoursToNextService,
  meterProgress,
  nextServiceHours,
} from '@/features/equipment/types'
import { implementToStatus, type ImplementResponse } from '../types'
import { ImplementCategoryBadge } from './ImplementCategoryBadge'

type ImplementCardProps = {
  item: ImplementResponse
  canManage: boolean
  canDelete: boolean
  onDetails: (item: ImplementResponse) => void
  onEdit: (item: ImplementResponse) => void
  onAttach: (item: ImplementResponse) => void
  onDetach: (item: ImplementResponse) => void
  onMaintenance: (item: ImplementResponse) => void
  onShare: (item: ImplementResponse) => void
  onDelete: (item: ImplementResponse) => void
}

export function ImplementCard({
  item,
  canManage,
  canDelete,
  onDetails,
  onEdit,
  onAttach,
  onDetach,
  onMaintenance,
  onShare,
  onDelete,
}: ImplementCardProps) {
  const nextAt = nextServiceHours(item.next_service_hours, item.maintenance)
  const remaining = hoursToNextService(
    item.current_usage_hours,
    item.next_service_hours,
    item.maintenance,
  )
  const progress = meterProgress(
    item.current_usage_hours,
    item.next_service_hours,
    item.maintenance,
  )

  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = []
    if (canManage) {
      list.push({
        id: 'to',
        label: 'ТО',
        icon: Wrench,
        onSelect: () => onMaintenance(item),
      })
      list.push({
        id: 'share',
        label: 'Шеринг',
        icon: Share2,
        onSelect: () => onShare(item),
      })
      if (item.current_equipment_id) {
        list.push({
          id: 'detach',
          label: 'Открепить',
          icon: Link2Off,
          onSelect: () => onDetach(item),
        })
      }
    }
    if (canDelete) {
      list.push({
        id: 'delete',
        label: 'Удалить',
        icon: Trash2,
        variant: 'destructive',
        onSelect: () => onDelete(item),
      })
    }
    return list
  }, [canDelete, canManage, item, onDelete, onDetach, onMaintenance, onShare])

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
      data-testid="implement-card"
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
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 text-lg font-semibold leading-snug break-words text-foreground">
            {item.name}
          </CardTitle>
          <CardActionsMenu actions={actions} title={item.name} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ImplementCategoryBadge category={item.category} />
          <ToStatusBadge status={implementToStatus(item)} />
          <AssetOperationalStatus implementId={item.id} compact showPurchases={false} />
          {item.sharing_status === 'active' ? (
            <Badge className="bg-success text-primary-foreground hover:bg-success">
              В шеринге
            </Badge>
          ) : null}
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
                {item.current_usage_hours} ч → ТО на {nextAt} ч
                {remaining != null ? ` (осталось ${remaining})` : ''}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium tabular-nums text-foreground">
              {item.current_usage_hours} ч наработки
            </p>
          )}
          {item.current_equipment_name ? (
            <p className="text-xs text-muted-foreground">
              Прикреплено к: {item.current_equipment_name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Свободно</p>
          )}
        </div>

        <AssetPurchasePlannerHint implementId={item.id} />

        {canManage ? (
          <div
            className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              className="min-h-11 flex-1 bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10"
              onClick={() => onAttach(item)}
            >
              <Link2 className="size-4" />
              Прикрепить
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 sm:min-h-10"
              onClick={() => onEdit(item)}
            >
              <Pencil className="size-4" />
              Изменить
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
