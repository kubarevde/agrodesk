import type { ShipmentRequest } from '../types'
import { isOverdue, isUrgent } from '../labels'

export type ShipmentRequestsViewProps = {
  rows: ShipmentRequest[]
  canManage: boolean
  onStart: (id: string) => void
  onComplete: (id: string) => void
  onCancel: (id: string) => void
  onAssign?: (id: string) => void
  busyId?: string | null
}

export function rowTone(row: ShipmentRequest): string {
  if (isUrgent(row)) return 'bg-destructive/5'
  if (isOverdue(row)) return 'bg-amber-500/5'
  return ''
}
