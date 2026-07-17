import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ShoppingBag } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { cn } from '@/lib/utils'
import { usePurchaseItems } from '../hooks'
import { usePlannerFilterContext } from '../lib/plannerFilterContext'
import { sortForChecklist } from '../lib/checklistMode'
import type { PurchaseFilters } from '../types'
import { PurchaseChecklistRow } from './PurchaseChecklistRow'

type PurchaseChecklistViewProps = {
  assetFilters?: Pick<PurchaseFilters, 'equipmentId' | 'implementId' | 'maintenanceId'>
}

export function PurchaseChecklistView({ assetFilters = {} }: PurchaseChecklistViewProps) {
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const filterCtx = usePlannerFilterContext(assetFilters)

  const { data: openItems = [], isLoading } = usePurchaseItems({
    status: 'planned',
    urgency: urgentOnly ? 'urgent' : undefined,
    ...assetFilters,
  })
  const { data: closedItems = [] } = usePurchaseItems({
    status: 'purchased',
    ...assetFilters,
  })

  const items = useMemo(() => {
    const merged = showClosed ? [...openItems, ...closedItems] : openItems
    return sortForChecklist(merged)
  }, [openItems, closedItems, showClosed])

  if (isLoading) return <PageSkeleton />

  const remaining = openItems.length

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-1 space-y-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            Осталось купить: <span className="text-primary">{remaining}</span>
          </p>
          {filterCtx.assetName ? (
            <p className="text-xs text-muted-foreground">Для: {filterCtx.assetName}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={urgentOnly} onClick={() => setUrgentOnly((v) => !v)}>
            Только срочные
          </FilterChip>
          <FilterChip active={showClosed} onClick={() => setShowClosed((v) => !v)}>
            {showClosed ? 'Скрыть купленное' : 'Показать купленное'}
          </FilterChip>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Список пуст"
          description={
            filterCtx.assetName
              ? `Нет открытых закупок для «${filterCtx.assetName}».`
              : 'Все позиции закрыты — можно вернуться позже.'
          }
          action={
            assetFilters.equipmentId || assetFilters.implementId
              ? {
                  label: 'Все закупки',
                  onClick: () => {
                    window.location.href = '/purchase-planner?mode=checklist'
                  },
                }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-2 pb-4">
          {items.map((item) => (
            <PurchaseChecklistRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      {assetFilters.maintenanceId ? (
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/maintenance" className="text-primary hover:underline">
            Вернуться к ремонту
          </Link>
        </p>
      ) : null}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
