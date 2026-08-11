import { Clock, Pencil, Share2, Sprout, Trash2, Wheat } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import type { SeasonPlantingOverlay } from '../seasonPlantingTypes'
import type { FieldResponse } from '../types'

type FieldCardProps = {
  field: FieldResponse
  seasonPlantings?: SeasonPlantingOverlay[]
  canManage: boolean
  canDelete: boolean
  onOpen: (field: FieldResponse) => void
  onEdit: (field: FieldResponse) => void
  onShare: (field: FieldResponse) => void
  onDelete: (field: FieldResponse) => void
  onHarvest?: (field: FieldResponse) => void
}

function contourLabel(field: FieldResponse): string {
  if (field.polygon && field.polygon.length >= 3) {
    return `Контур · ${field.polygon.length} точек`
  }
  if (field.latitude != null && field.longitude != null) {
    return 'Только точка · контур не нарисован'
  }
  return 'Без карты'
}

function plantingCaption(row: SeasonPlantingOverlay): string {
  const crop = row.cropName || row.cropCode
  return row.varietyName ? `${crop} · ${row.varietyName}` : crop
}

export function FieldCard({
  field,
  seasonPlantings = [],
  canManage,
  canDelete,
  onOpen,
  onEdit,
  onShare,
  onDelete,
  onHarvest,
}: FieldCardProps) {
  const menuOpenRef = useRef(false)
  const activePlantings = seasonPlantings.filter((row) => row.status !== 'cancelled')

  const actions = useMemo((): CardActionItem[] => {
    const list: CardActionItem[] = [
      {
        id: 'crops',
        label: 'Культуры и сорта',
        icon: Sprout,
        onSelect: () => onOpen(field),
      },
    ]
    if (canManage) {
      list.push({
        id: 'shifts',
        label: 'Смены',
        icon: Clock,
        onSelect: () => {
          window.location.assign(`/worktime?field_id=${encodeURIComponent(field.id)}`)
        },
      })
      list.push({
        id: 'share',
        label: 'Шеринг',
        icon: Share2,
        onSelect: () => onShare(field),
      })
    }
    if (canDelete) {
      list.push({
        id: 'delete',
        label: 'Удалить',
        icon: Trash2,
        variant: 'destructive',
        onSelect: () => onDelete(field),
      })
    }
    return list
  }, [canDelete, canManage, field, onDelete, onOpen, onShare])

  return (
    <Card
      className="flex cursor-pointer flex-col overflow-hidden transition-colors hover:border-primary/40"
      data-testid="field-card"
      role="button"
      tabIndex={0}
      onClick={() => {
        if (menuOpenRef.current) return
        onOpen(field)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(field)
        }
      }}
    >
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 text-lg font-semibold leading-snug break-words text-foreground">
            {field.name}
          </CardTitle>
          <CardActionsMenu
            actions={actions}
            title={field.name}
            onOpenChange={(open) => {
              menuOpenRef.current = open
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activePlantings.length > 0 ? (
            activePlantings.slice(0, 3).map((row) => (
              <Badge key={row.id} variant="secondary">
                {plantingCaption(row)}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Культуры/посевы не добавлены</span>
          )}
          {activePlantings.length > 3 ? (
            <span className="text-xs text-muted-foreground">+{activePlantings.length - 3}</span>
          ) : null}
          {field.sharing_status === 'active' ? (
            <Badge className="bg-success text-primary-foreground hover:bg-success">В шеринге</Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="space-y-1">
          <p className="text-base font-medium tabular-nums text-foreground">
            {field.area_ha != null ? `${field.area_ha} га` : 'Площадь не указана'}
          </p>
          <p className="text-xs text-muted-foreground">{contourLabel(field)}</p>
          {field.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{field.description}</p>
          ) : null}
        </div>

        {canManage ? (
          <div
            className="mt-auto flex flex-col gap-2 sm:flex-row sm:flex-wrap"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {onHarvest ? (
              <Button
                type="button"
                className="min-h-11 flex-1 bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10"
                onClick={() => onHarvest(field)}
              >
                <Wheat className="size-4" />
                Собрать урожай
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1 sm:min-h-10"
              onClick={() => onEdit(field)}
            >
              <Pencil className="size-4" />
              Редактировать
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
