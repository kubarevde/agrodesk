import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ShoppingCart, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePurchaseItems } from '@/features/purchase-planner/hooks'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import { RepairDetailDialog } from '@/features/repair-journal/components/RepairDetailDialog'
import { RepairStatusBadges } from '@/features/repair-journal/components/RepairStatusBadges'
import { useRepairs } from '@/features/repair-journal/hooks'
import { isActiveRepair, isInRepair } from '@/features/repair-journal/lib/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import { AssetOperationalStatus } from './AssetOperationalStatus'
import { plannedPositionsLabel } from './AssetPurchasePlannerHint'

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
  const [repairOpen, setRepairOpen] = useState(false)
  const { data: statusDict = [] } = useDictionary('repair_status')
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

  const activeRepair = repairs.find((r) => isActiveRepair(r))
  const lastDone = repairs.find((r) => r.status === 'done')
  const repairPurchases = activeRepair
    ? openPurchases.filter((p) => p.maintenanceId === activeRepair.id)
    : []
  const otherPurchases = activeRepair
    ? openPurchases.filter((p) => p.maintenanceId !== activeRepair.id)
    : openPurchases

  const assetName = equipmentName ?? implementName ?? 'единица'
  let nextAction = 'В строю — плановое ТО по расписанию'
  if (activeRepair?.waitingParts && !isInRepair(activeRepair)) {
    nextAction = `Ожидает запчасти${repairPurchases.length ? ` (${repairPurchases.length} к покупке)` : ''}`
  } else if (activeRepair?.waitingParts) {
    nextAction = `В ремонте и ожидает запчасти${repairPurchases.length ? ` (${repairPurchases.length} к покупке)` : ''}`
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
            <RepairStatusBadges
              status={activeRepair.status}
              waitingParts={activeRepair.waitingParts}
              dict={statusDict}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Чек-лист: {activeRepair.checklistDone}/{activeRepair.checklistTotal}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-8 sm:px-3"
              onClick={() => setRepairOpen(true)}
            >
              Открыть ремонт
            </Button>
            {repairPurchases.length > 0 ? (
              <Link
                to="/purchase-planner"
                search={plannerLinkSearch}
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border px-3 text-sm hover:bg-muted/30 sm:min-h-8"
              >
                <ShoppingCart className="size-3.5" />
                Закупки ремонта ({repairPurchases.length})
              </Link>
            ) : null}
          </div>
          <RepairDetailDialog
            entry={activeRepair}
            open={repairOpen}
            onClose={() => setRepairOpen(false)}
          />
        </div>
      ) : null}

      {openPurchases.length > 0 ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <ShoppingCart className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {plannedPositionsLabel(openPurchases.length)}
          </p>
          <ul className="space-y-1">
            {[...repairPurchases, ...otherPurchases].slice(0, 4).map((item) => (
              <li key={item.id} className="text-sm text-muted-foreground">
                · {item.title}
                {item.maintenanceId ? (
                  <span className="text-xs"> (для ремонта)</span>
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
            className="inline-flex min-h-11 items-center text-sm text-primary hover:underline sm:min-h-0"
          >
            Открыть планировщик
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
