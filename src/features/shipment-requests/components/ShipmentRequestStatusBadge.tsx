import { CheckCircle2, CircleDashed, PlayCircle, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ShipmentRequestStatus } from '../types'
import { STATUS_LABELS } from '../labels'

const STATUS_CLASS: Record<ShipmentRequestStatus, string> = {
  new: 'border-primary/30 bg-primary/10 text-primary',
  in_progress: 'border-amber-600/30 bg-amber-500/15 text-amber-800',
  done: 'border-success/30 bg-success/10 text-success',
  cancelled: 'border-border bg-muted text-muted-foreground',
}

const STATUS_ICON: Record<ShipmentRequestStatus, LucideIcon> = {
  new: CircleDashed,
  in_progress: PlayCircle,
  done: CheckCircle2,
  cancelled: XCircle,
}

type Props = {
  status: ShipmentRequestStatus
  overdue?: boolean
}

export function ShipmentRequestStatusBadge({ status, overdue }: Props) {
  const Icon = STATUS_ICON[status]
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant="outline" className={cn('gap-1 font-medium', STATUS_CLASS[status])}>
        <Icon className="size-3.5" aria-hidden />
        {STATUS_LABELS[status]}
      </Badge>
      {overdue ? (
        <Badge variant="destructive" className="font-medium">
          Просрочено
        </Badge>
      ) : null}
    </span>
  )
}
