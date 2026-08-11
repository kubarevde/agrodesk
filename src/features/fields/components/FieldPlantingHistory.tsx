import { Sprout } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import type { FieldPlanting } from '../plantingTypes'
import {
  PLANTING_STATUS_LABELS,
  formatAreaHa,
  formatYield,
} from '../plantingTypes'

type FieldPlantingHistoryProps = {
  plantings: FieldPlanting[]
  currentSeasonYear: number
}

export function FieldPlantingHistory({
  plantings,
  currentSeasonYear,
}: FieldPlantingHistoryProps) {
  const history = plantings
    .filter((p) => p.seasonYear !== currentSeasonYear || p.status === 'cancelled')
    .sort((a, b) => b.seasonYear - a.seasonYear)

  if (history.length === 0) {
    return (
      <EmptyState
        icon={Sprout}
        title="Прошлых сезонов пока нет"
        description="Здесь появятся посевы прошлых лет и отменённые посевы текущего сезона. Текущие культуры — во вкладке «Культуры»."
      />
    )
  }

  const byYear = new Map<number, FieldPlanting[]>()
  for (const row of history) {
    const list = byYear.get(row.seasonYear) ?? []
    list.push(row)
    byYear.set(row.seasonYear, list)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Архив посевов по сезонам и отменённые посевы {currentSeasonYear} года. Текущие
        культуры — во вкладке «Культуры».
      </p>
      {[...byYear.entries()].map(([year, rows]) => (
        <section key={year} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Сезон {year}</h3>
          <ul className="min-w-0 space-y-2">
            {rows.map((row) => {
              const yieldLabel = formatYield(row.yieldKgPerHa)
              const crop = row.cropName || row.cropCode
              const variety = row.varietyName ?? 'сорт не указан'
              const isFact = row.status === 'harvested' || row.status === 'partially_harvested'
              return (
                <li
                  key={row.id}
                  className="min-w-0 rounded-lg border border-border bg-surface p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {crop} · {variety}
                    </p>
                    <Badge variant={isFact ? 'default' : 'outline'}>
                      {isFact ? 'Факт' : 'План'}: {PLANTING_STATUS_LABELS[row.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatAreaHa(row.areaHa)}
                    {row.plantedAt ? ` · посев ${row.plantedAt}` : ''}
                    {row.harvestedAt ? ` · уборка ${row.harvestedAt}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Сбор:{' '}
                    {row.harvestedQty != null
                      ? `${row.harvestedQty} кг`
                      : row.hasHarvest
                        ? 'есть (без разбивки по сортам)'
                        : '—'}
                    {yieldLabel ? ` · ${yieldLabel}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
