import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toStatusClass, toStatusLabel, type ToStatus } from '../types'

const ICONS: Record<ToStatus, LucideIcon> = {
  ok: CheckCircle2,
  warning: AlertTriangle,
  overdue: XCircle,
  no_data: CircleHelp,
}

type ToStatusBadgeProps = {
  status: ToStatus
  className?: string
}

export function ToStatusBadge({ status, className }: ToStatusBadgeProps) {
  const Icon = ICONS[status]
  return (
    <Badge className={cn(toStatusClass(status), 'gap-1', className)}>
      <Icon className="size-3.5" aria-hidden />
      {toStatusLabel(status)}
    </Badge>
  )
}
