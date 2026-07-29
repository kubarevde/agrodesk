import { ClipboardList, Minus, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import type { InventoryOperation } from '@/types'
import { cn } from '@/lib/utils'
import { getInventoryOperationLabel } from '../utils'

type InventoryItemOperationsHistoryProps = {
  operations: InventoryOperation[]
  unit: string
  isLoading: boolean
  isError?: boolean
}

export function InventoryItemOperationsHistory({
  operations,
  unit,
  isLoading,
  isError = false,
}: InventoryItemOperationsHistoryProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Последние операции</h3>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить историю операций</p>
      ) : operations.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Операций пока нет"
          description="Приходы и списания по этой позиции появятся здесь"
        />
      ) : (
        <ul className="space-y-2">
          {operations.map((operation) => (
            <li
              key={operation.id}
              className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{operation.date}</p>
                  <p
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-medium',
                      operation.type === 'income' ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {operation.type === 'income' ? (
                      <Plus className="size-3.5" />
                    ) : (
                      <Minus className="size-3.5" />
                    )}
                    {getInventoryOperationLabel(operation)}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    {operation.quantity.toLocaleString('ru-RU')} {unit}
                  </p>
                  <p>
                    Остаток: {operation.stockAfter.toLocaleString('ru-RU')} {unit}
                  </p>
                </div>
              </div>

              {operation.createdByName ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Выполнил: {operation.createdByName}
                </p>
              ) : null}
              {operation.supplier ? (
                <p className="mt-1 text-xs text-muted-foreground">Поставщик: {operation.supplier}</p>
              ) : null}
              {operation.reason ? (
                <p className="mt-1 text-xs text-foreground line-clamp-2">{operation.reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
