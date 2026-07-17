import { Link } from '@tanstack/react-router'
import { ShoppingCart, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { usePurchaseItems } from '@/features/purchase-planner/hooks'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import { useRepairs } from '@/features/repair-journal/hooks'
import {
  getStatusBadgeClass,
  STATUS_LABELS,
} from '@/features/repair-journal/lib/labels'
import { AssetOperationalStatus } from './AssetOperationalStatus'

const ACTIVE_STATUSES = new Set(['in_progress', 'waiting_parts'])

type AssetOperationalSummaryProps = {
  equipmentId?: string
  implementId?: string
  equipmentName?: string
  implementName?: string
}

export function AssetOperationalSummary({
  equipmentId,
  implementId,
  equipmentName,
  implementName,
}: AssetOperationalSummaryProps) {
  const { data: repairs = [], isLoading: repairsLoading } = useRepairs({
    equipmentId,
    implementId,
  })
  const { data: openPurchases = [], isLoading: purchasesLoading } = usePurchaseItems({
    status: 'planned',
    equipmentId,
    implementId,
  })

  if (repairsLoading || purchasesLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка статуса…</p>
  }

  const activeRepair = repairs.find((r) => ACTIVE_STATUSES.has(r.status))
  const lastDone = repairs.find((r) => r.status === 'done')
  const repairPurchases = activeRepair
    ? openPurchases.filter((p) => p.maintenanceId === activeRepair.id)
    : []
  const otherPurchases = activeRepair
    ? openPurchases.filter((p) => p.maintenanceId !== activeRepair.id)
    : openPurchases

  const assetName = equipmentName ?? implementName ?? 'единица'
  let nextAction = 'В строю — плановое ТО по расписанию'
  if (activeRepair?.status === 'waiting_parts') {
    nextAction = `Ожидает запчасти${repairPurchases.length ? ` (${repairPurchases.length} к покупке)` : ''}`
  } else if (activeRepair) {
    nextAction = 'В ремонте — завершите чек-лист работ'
  } else if (openPurchases.length > 0) {
    nextAction = `Купить ${openPurchases.length} поз. для ${assetName}`
  }

  const hasContent = activeRepair || openPurchases.length > 0 || lastDone
  if (!hasContent) return null

  const plannerLinkSearch = purchasePlannerSearch({
    mode: 'checklist',
    equipmentId,
    implementId,
  })

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Ремонт и закупки</h2>
        <AssetOperationalStatus equipmentId={equipmentId} implementId={implementId} compact />
      </div>

      <p className="text-sm text-foreground">
        Ближайшее действие: <span className="text-muted-foreground">{nextAction}</span>
      </p>

      {activeRepair ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Wrench className="size-4 text-primary" />
            <p className="text-sm font-medium">{activeRepair.type}</p>
            <Badge variant="outline" className={getStatusBadgeClass(activeRepair.status)}>
              {STATUS_LABELS[activeRepair.status] ?? activeRepair.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Чек-лист: {activeRepair.checklistDone}/{activeRepair.checklistTotal}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/maintenance"
              className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm hover:bg-muted/30"
            >
              Открыть ремонт
            </Link>
            {repairPurchases.length > 0 ? (
              <Link
                to="/purchase-planner"
                search={plannerLinkSearch}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-muted/30"
              >
                <ShoppingCart className="size-3.5" />
                Закупки ремонта ({repairPurchases.length})
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {openPurchases.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">К покупке</p>
          <ul className="space-y-1">
            {[...repairPurchases, ...otherPurchases].slice(0, 4).map((item) => (
              <li key={item.id} className="text-sm text-foreground">
                · {item.title}
                {item.maintenanceId ? (
                  <span className="text-xs text-muted-foreground"> (для ремонта)</span>
                ) : null}
              </li>
            ))}
          </ul>
          {openPurchases.length > 4 ? (
            <p className="text-xs text-muted-foreground">и ещё {openPurchases.length - 4}…</p>
          ) : null}
          <Link
            to="/purchase-planner"
            search={plannerLinkSearch}
            className="text-sm text-primary hover:underline"
          >
            Весь список закупок
          </Link>
        </div>
      ) : null}

      {!activeRepair && lastDone ? (
        <p className="text-xs text-muted-foreground">
          Последний ремонт: {lastDone.date} · {lastDone.type}
        </p>
      ) : null}
    </section>
  )
}
