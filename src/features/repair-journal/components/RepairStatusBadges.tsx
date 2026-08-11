import { Badge } from '@/components/ui/badge'
import {
  getStatusBadgeClass,
  getWaitingPartsBadgeClass,
  isWaitingPartsStatus,
  repairStatusLabel,
} from '../lib/labels'

type RepairStatusBadgesProps = {
  status: string
  waitingParts?: boolean
  dict?: ReadonlyArray<{ code: string; name: string }> | null
}

export function RepairStatusBadges({
  status,
  waitingParts = false,
  dict,
}: RepairStatusBadgesProps) {
  // Status «Ожидает запчасти» is enough — do not duplicate the flag badge.
  if (isWaitingPartsStatus(status)) {
    return (
      <Badge variant="outline" className={getWaitingPartsBadgeClass()}>
        {repairStatusLabel(status, dict)}
      </Badge>
    )
  }

  return (
    <>
      <Badge variant="outline" className={getStatusBadgeClass(status)}>
        {repairStatusLabel(status, dict)}
      </Badge>
      {waitingParts ? (
        <Badge variant="outline" className={getWaitingPartsBadgeClass()}>
          Ожидает запчасти
        </Badge>
      ) : null}
    </>
  )
}
