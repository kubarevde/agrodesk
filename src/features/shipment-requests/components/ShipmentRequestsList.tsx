import type { ShipmentRequest } from '../types'
import { ShipmentRequestsCards } from './ShipmentRequestsCards'
import { ShipmentRequestsTable } from './ShipmentRequestsTable'

type Props = {
  rows: ShipmentRequest[]
  canManage: boolean
  onStart: (id: string) => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onAssign?: (id: string) => void
  busyId?: string | null
}

/** Responsive list: cards on mobile, table from md+. Same data/hooks for both. */
export function ShipmentRequestsList(props: Props) {
  return (
    <div className="space-y-3">
      <ShipmentRequestsCards {...props} />
      <ShipmentRequestsTable {...props} />
    </div>
  )
}
