import { Pencil, Plus, Sprout, UserX } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FieldPlanting, FieldPlantingsSummary } from '../plantingTypes'
import {
  PLANTING_STATUS_LABELS,
  formatAreaHa,
  formatYield,
} from '../plantingTypes'
import { plantingColorSwatchClass } from '../plantingColors'

type FieldPlantingsPanelProps = {
  plantings: FieldPlanting[]
  summary: FieldPlantingsSummary | undefined
  isLoading: boolean
  canManage: boolean
  onAdd: () => void
  onEdit: (row: FieldPlanting) => void
  onCancel: (row: FieldPlanting) => void
}

function cropLabel(row: FieldPlanting): string {
  const crop = row.cropName || row.cropCode
  if (row.varietyName) return `${crop} · ${row.varietyName}`
  return `${crop} · сорт не указан`
}

export function FieldPlantingsPanel({
  plantings,
  summary,
  isLoading,
  canManage,
  onAdd,
  onEdit,
  onCancel,
}: FieldPlantingsPanelProps) {
  const active = plantings.filter((p) => p.status !== 'cancelled')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Площадь поля</p>
          <p className="font-medium tabular-nums">{formatAreaHa(summary?.fieldAreaHa)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Распределено ({summary?.seasonYear})</p>
          <p className="font-medium tabular-nums">{formatAreaHa(summary?.allocatedHa)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Остаток</p>
          <p className="font-medium tabular-nums text-primary">
            {formatAreaHa(summary?.remainingHa)}
          </p>
        </div>
      </div>

      {summary?.legacyNote ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Устаревшая запись культуры</p>
          <p className="mt-1">{summary.legacyNote}</p>
        </div>
      ) : null}

      {canManage ? (
        <div className="flex justify-stretch sm:justify-end">
          <Button
            type="button"
            className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10 sm:w-auto"
            onClick={onAdd}
          >
            <Plus className="size-4" />
            Добавить культуру / посев
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <SkeletonTable rows={3} columns={2} />
      ) : active.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="Культуры/посевы не добавлены"
          description="Добавьте культуру и сорт на всё поле или на часть контура — это единственный источник культуры для поля."
          action={canManage ? { label: 'Добавить культуру / посев', onClick: onAdd } : undefined}
        />
      ) : (
        <ul className="min-w-0 space-y-3">
          {active.map((row) => {
            const yieldLabel = formatYield(row.yieldKgPerHa)
            return (
              <li
                key={row.id}
                className="min-w-0 rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="flex min-w-0 items-start gap-2 font-medium break-words text-foreground">
                      <span
                        className={`mt-1.5 inline-block size-3 shrink-0 rounded-full ${plantingColorSwatchClass(row.mapColor)}`}
                        aria-hidden
                      />
                      <span className="min-w-0">{cropLabel(row)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{PLANTING_STATUS_LABELS[row.status]}</Badge>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatAreaHa(row.areaHa)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Посев: {row.plantedAt ?? 'не указана'}
                      {row.harvestedAt ? ` · Уборка: ${row.harvestedAt}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Собрано:{' '}
                      {row.harvestedQty != null
                        ? `${row.harvestedQty} кг`
                        : row.hasHarvest
                          ? 'есть (без привязки к посеву)'
                          : '—'}
                      {yieldLabel ? ` · Урожайность: ${yieldLabel}` : row.areaHa <= 0 ? ' · Не рассчитано' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Заявлено: {row.requestedQty != null ? `${row.requestedQty} кг` : '—'}
                      {' · '}
                      Отгружено: {row.shippedQty != null ? `${row.shippedQty} кг` : '—'}
                    </p>
                  </div>
                  {canManage ? (
                    <CardActionsMenu
                      title={cropLabel(row)}
                      elevated
                      actions={[
                        {
                          id: 'edit',
                          label: 'Изменить',
                          icon: Pencil,
                          onSelect: () => onEdit(row),
                        },
                        {
                          id: 'cancel',
                          label: 'Отменить посев',
                          icon: UserX,
                          variant: 'destructive',
                          onSelect: () => onCancel(row),
                        },
                      ]}
                    />
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
