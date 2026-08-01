import { AlertTriangle } from 'lucide-react'
import type { ListingStatus } from '../types'
import { LISTING_STATUS_LABELS } from '../labels'
import { cn } from '@/lib/utils'

const BADGE_STYLES: Record<ListingStatus, string> = {
  draft: 'border-border bg-muted text-muted-foreground',
  pending_review: 'border-primary/25 bg-primary/10 text-primary',
  published: 'border-[color:var(--success)]/30 bg-[color:var(--success)]/15 text-[color:var(--success)]',
  rejected: 'border-destructive/30 bg-destructive/10 text-destructive',
  archived: 'border-border bg-muted/70 text-muted-foreground',
}

/** Left accent for list rows — visual grouping without a second status system. */
export const LISTING_ROW_ACCENT: Record<ListingStatus, string> = {
  draft: 'border-l-muted-foreground/40',
  pending_review: 'border-l-primary',
  published: 'border-l-[color:var(--success)]',
  rejected: 'border-l-destructive',
  archived: 'border-l-border',
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        BADGE_STYLES[status],
      )}
      data-testid="listing-status-badge"
      data-status={status}
    >
      {LISTING_STATUS_LABELS[status]}
    </span>
  )
}

export function RejectionBanner({
  reason,
  showFixHint = false,
}: {
  reason: string
  /** Extra line for list/edit — does not change moderation rules. */
  showFixHint?: boolean
}) {
  return (
    <div
      className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm"
      data-testid="rejection-reason"
      role="alert"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-destructive">Отклонено модерацией</p>
        <p className="break-words text-destructive/90">{reason}</p>
        {showFixHint ? (
          <p className="text-xs text-muted-foreground">
            Внесите правки и снова нажмите «Отправить на модерацию». Самопубликации нет.
          </p>
        ) : null}
      </div>
    </div>
  )
}
