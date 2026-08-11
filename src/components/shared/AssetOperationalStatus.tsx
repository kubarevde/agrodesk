import { useState, type MouseEvent, type KeyboardEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import { Badge } from '@/components/ui/badge'
import { usePurchaseItems } from '@/features/purchase-planner/hooks'
import { RepairDetailDialog } from '@/features/repair-journal/components/RepairDetailDialog'
import { RepairStatusBadges } from '@/features/repair-journal/components/RepairStatusBadges'
import { useRepairs } from '@/features/repair-journal/hooks'
import { isActiveRepair } from '@/features/repair-journal/lib/labels'
import { useDictionary } from '@/features/dictionaries/hooks'

type AssetOperationalStatusProps = {
  equipmentId?: string
  implementId?: string
  compact?: boolean
  /** When false, only repair badge is shown (purchases handled elsewhere). Default true. */
  showPurchases?: boolean
}

export function AssetOperationalStatus({
  equipmentId,
  implementId,
  compact = false,
  showPurchases = true,
}: AssetOperationalStatusProps) {
  const [repairOpen, setRepairOpen] = useState(false)
  const { data: statusDict = [] } = useDictionary('repair_status')
  const { data: repairs = [] } = useRepairs({
    equipmentId,
    implementId,
    includeDone: false,
  })
  const { data: purchases = [] } = usePurchaseItems(
    {
      status: 'planned',
      equipmentId,
      implementId,
    },
    showPurchases,
  )

  const activeRepair = repairs.find((r) => isActiveRepair(r))
  const plannedCount = showPurchases ? purchases.length : 0
  const urgentCount = purchases.filter((p) => p.urgency === 'urgent').length

  if (!activeRepair && plannedCount === 0) return null

  const stopCardNav = (event: MouseEvent | KeyboardEvent) => {
    event.stopPropagation()
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-1'}`}>
      {activeRepair ? (
        <button
          type="button"
          className="inline-flex cursor-pointer flex-wrap gap-1"
          onClick={(event) => {
            stopCardNav(event)
            setRepairOpen(true)
          }}
          onKeyDown={stopCardNav}
        >
          <RepairStatusBadges
            status={activeRepair.status}
            waitingParts={activeRepair.waitingParts}
            dict={statusDict}
          />
        </button>
      ) : null}
      {plannedCount > 0 ? (
        <Link
          to="/purchase-planner"
          search={purchasePlannerSearch({
            mode: 'checklist',
            equipmentId,
            implementId,
          })}
          className="inline-flex"
          onClick={stopCardNav}
        >
          <Badge
            variant="outline"
            className={
              urgentCount > 0
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-primary/30 bg-primary/5 text-primary'
            }
          >
            Купить: {plannedCount}
            {urgentCount > 0 ? ` (${urgentCount} срочно)` : ''}
          </Badge>
        </Link>
      ) : null}

      {activeRepair ? (
        <RepairDetailDialog
          entry={activeRepair}
          open={repairOpen}
          onClose={() => setRepairOpen(false)}
        />
      ) : null}
    </div>
  )
}
