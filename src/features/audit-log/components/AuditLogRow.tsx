import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditSectionLabel,
} from '../lib/auditLabels'
import type { AuditLogEntry } from '../types'

const ACTION_CLASS: Record<string, string> = {
  create: 'border-success/40 bg-success/10 text-success',
  created: 'border-success/40 bg-success/10 text-success',
  update: 'border-primary/40 bg-primary/10 text-primary',
  updated: 'border-primary/40 bg-primary/10 text-primary',
  delete: 'border-destructive/40 bg-destructive/10 text-destructive',
  deleted: 'border-destructive/40 bg-destructive/10 text-destructive',
}

type AuditLogRowProps = {
  entry: AuditLogEntry
  onDetails: (entry: AuditLogEntry) => void
  compact?: boolean
}

export function AuditActionBadge({ action }: { action: string }) {
  const key = action.trim().toLowerCase()
  return (
    <Badge variant="outline" className={ACTION_CLASS[key] ?? ''}>
      {getAuditActionLabel(action)}
    </Badge>
  )
}

export function formatAuditWhen(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm', { locale: ru })
  } catch {
    return iso
  }
}

export function AuditLogRow({ entry, onDetails, compact }: AuditLogRowProps) {
  const sectionLabel = getAuditSectionLabel(entry.entityType)
  const actorLabel = getAuditActorLabel(entry.changedByName, entry.changedBy)

  if (compact) {
    return (
      <button
        type="button"
        className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => onDetails(entry)}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <AuditActionBadge action={entry.action} />
          <span className="text-xs text-muted-foreground">{formatAuditWhen(entry.changedAt)}</span>
        </div>
        <p className="text-sm font-medium text-foreground">{entry.summary || sectionLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {actorLabel} · {sectionLabel}
        </p>
      </button>
    )
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2 text-sm whitespace-nowrap text-muted-foreground">
        {formatAuditWhen(entry.changedAt)}
      </td>
      <td className="px-3 py-2 text-sm">{actorLabel}</td>
      <td className="px-3 py-2 text-sm">{sectionLabel}</td>
      <td className="px-3 py-2">
        <AuditActionBadge action={entry.action} />
      </td>
      <td className="px-3 py-2 text-sm">{entry.summary || '—'}</td>
      <td className="px-3 py-2 text-right">
        <Button type="button" variant="ghost" size="sm" onClick={() => onDetails(entry)}>
          Подробнее
        </Button>
      </td>
    </tr>
  )
}
