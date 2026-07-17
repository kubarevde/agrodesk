import { Link } from '@tanstack/react-router'
import { purchasePlannerSearch } from '@/features/purchase-planner/lib/plannerSearch'
import { Badge } from '@/components/ui/badge'
import { usePurchaseItems } from '@/features/purchase-planner/hooks'
import { useRepairs } from '@/features/repair-journal/hooks'
import {
  getStatusBadgeClass,
  STATUS_LABELS,
} from '@/features/repair-journal/lib/labels'

const ACTIVE_REPAIR_STATUSES = new Set(['in_progress', 'waiting_parts'])

type AssetOperationalStatusProps = {
  equipmentId?: string
  implementId?: string
  compact?: boolean
}

export function AssetOperationalStatus({
  equipmentId,
  implementId,
  compact = false,
}: AssetOperationalStatusProps) {
  const { data: repairs = [] } = useRepairs({
    equipmentId,
    implementId,
    includeDone: false,
  })
  const { data: purchases = [] } = usePurchaseItems({
    status: 'planned',
    equipmentId,
    implementId,
  })

  const activeRepair = repairs.find((r) => ACTIVE_REPAIR_STATUSES.has(r.status))
  const plannedCount = purchases.length
  const urgentCount = purchases.filter((p) => p.urgency === 'urgent').length

  if (!activeRepair && plannedCount === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'mt-1'}`}>
      {activeRepair ? (
        <Link to="/maintenance" className="inline-flex">
          <Badge variant="outline" className={getStatusBadgeClass(activeRepair.status)}>
            {STATUS_LABELS[activeRepair.status] ?? activeRepair.status}
          </Badge>
        </Link>
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
    </div>
  )
}
