import { MapPinned } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import type { InventoryOperation } from '@/types'
import { aggregateHarvestIncomeByFieldYear } from '@/features/fields/fieldHarvest'
import { isHarvestCategory } from '@/features/inventory/utils'

type HarvestFieldIncomesSummaryProps = {
  category: string
  unit: string
  operations: InventoryOperation[]
}

export function HarvestFieldIncomesSummary({
  category,
  unit,
  operations,
}: HarvestFieldIncomesSummaryProps) {
  if (!isHarvestCategory(category)) return null
  const rows = aggregateHarvestIncomeByFieldYear(operations)
  if (rows.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Сборы с полей</h3>
        <EmptyState
          icon={MapPinned}
          title="Пока нет сборов"
          description="Оприходуйте урожай кнопкой «Собрать урожай» на карточке поля."
        />
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Сборы с полей (по годам)</h3>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => (
          <li
            key={`${row.fieldId ?? 'none'}-${row.year}`}
            className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">{row.fieldName}</p>
              <p className="text-xs text-muted-foreground">{row.year}</p>
            </div>
            <p className="shrink-0 font-medium text-foreground">
              {row.quantity.toLocaleString('ru-RU')} {unit}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
