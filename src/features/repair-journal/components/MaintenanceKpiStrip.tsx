import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  PRIORITY_LABELS,
  getPriorityBadgeClass,
  getStatusBadgeClass,
  getWaitingPartsBadgeClass,
  repairStatusLabel,
} from '../lib/labels'

type StatusDictItem = { code: string; name: string }

type MaintenanceKpiStripProps = {
  urgentCount: number
  inRepairCount: number
  waitingCount: number
  doneCount: number
  statusDict: StatusDictItem[]
  onFilterUrgent: () => void
  onFilterInRepair: () => void
  onFilterWaitingParts: () => void
  onFilterDone: () => void
}

export function MaintenanceKpiStrip({
  urgentCount,
  inRepairCount,
  waitingCount,
  doneCount,
  statusDict,
  onFilterUrgent,
  onFilterInRepair,
  onFilterWaitingParts,
  onFilterDone,
}: MaintenanceKpiStripProps) {
  const tileClass =
    'h-auto flex-col items-start gap-0.5 rounded-lg border border-border bg-surface p-2.5'

  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      <Button type="button" variant="ghost" className={tileClass} onClick={onFilterUrgent}>
        <p className="text-[11px] text-muted-foreground">Срочно</p>
        <Badge variant="outline" className={getPriorityBadgeClass('urgent')}>
          {PRIORITY_LABELS.urgent} · {urgentCount}
        </Badge>
      </Button>
      <Button type="button" variant="ghost" className={tileClass} onClick={onFilterInRepair}>
        <p className="text-[11px] text-muted-foreground">В ремонте</p>
        <Badge variant="outline" className={getStatusBadgeClass('in_progress')}>
          {repairStatusLabel('in_progress', statusDict)} · {inRepairCount}
        </Badge>
      </Button>
      <Button type="button" variant="ghost" className={tileClass} onClick={onFilterWaitingParts}>
        <p className="text-[11px] text-muted-foreground">Ждут запчасти</p>
        <Badge variant="outline" className={getWaitingPartsBadgeClass()}>
          Ожидает запчасти · {waitingCount}
        </Badge>
      </Button>
      <Button type="button" variant="ghost" className={tileClass} onClick={onFilterDone}>
        <p className="text-[11px] text-muted-foreground">Готово</p>
        <Badge variant="outline" className={getStatusBadgeClass('done')}>
          {repairStatusLabel('done', statusDict)} · {doneCount}
        </Badge>
      </Button>
    </div>
  )
}
