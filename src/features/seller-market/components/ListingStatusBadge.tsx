import { AlertTriangle } from 'lucide-react'
import type { ListingStatus } from '../types'
import { LISTING_STATUS_LABELS } from '../labels'
import { cn } from '@/lib/utils'

const STYLES: Record<ListingStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-primary/10 text-primary',
  published: 'bg-[color:var(--success)]/15 text-[color:var(--success)]',
  rejected: 'bg-destructive/10 text-destructive',
  archived: 'bg-muted text-muted-foreground',
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        STYLES[status],
      )}
    >
      {LISTING_STATUS_LABELS[status]}
    </span>
  )
}

export function RejectionBanner({ reason }: { reason: string }) {
  return (
    <div
      className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm"
      data-testid="rejection-reason"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div>
        <p className="font-medium text-destructive">Отклонено модерацией</p>
        <p className="mt-0.5 text-destructive/90">{reason}</p>
      </div>
    </div>
  )
}
