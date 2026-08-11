import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { buildAuditDetailSections } from '../lib/auditDetail'
import { getAuditActorLabel, getAuditSectionLabel, localizeAuditSummary } from '../lib/auditLabels'
import type { AuditLogEntry } from '../types'
import { AuditActionBadge, formatAuditWhen } from './AuditLogRow'
import { AuditDetailFields } from './AuditDetailFields'

type AuditDiffDialogProps = {
  entry: AuditLogEntry | null
  open: boolean
  onClose: () => void
  /** Raise above Sheet panels (e.g. when opened from entity history). */
  elevated?: boolean
}

function actionMode(action: string): 'create' | 'update' | 'delete' | 'other' {
  const key = action.toLowerCase()
  if (key === 'create' || key === 'created') return 'create'
  if (key === 'delete' || key === 'deleted') return 'delete'
  if (key === 'update' || key === 'updated') return 'update'
  return 'other'
}

const ABOVE_SHEET_Z = 'z-[1200]'

export function AuditDiffDialog({ entry, open, onClose, elevated = false }: AuditDiffDialogProps) {
  const detail = entry ? buildAuditDetailSections(entry) : null
  const mode = entry ? actionMode(entry.action) : 'other'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          'flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
          elevated && ABOVE_SHEET_Z,
        )}
        overlayClassName={elevated ? ABOVE_SHEET_Z : undefined}
      >
        <DialogHeader className="border-b border-border px-4 py-4">
          <DialogTitle>Подробности изменения</DialogTitle>
          {entry ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AuditActionBadge action={entry.action} />
              <span className="text-sm text-muted-foreground">{formatAuditWhen(entry.changedAt)}</span>
            </div>
          ) : (
            <DialogDescription>Сведения об изменении</DialogDescription>
          )}
        </DialogHeader>

        {entry && detail ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <section className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <h3 className="text-sm font-medium text-foreground">Общая информация</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Кто изменил</dt>
                  <dd className="font-medium text-foreground">
                    {getAuditActorLabel(entry.changedByName, entry.changedBy)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Раздел</dt>
                  <dd className="font-medium text-foreground">
                    {getAuditSectionLabel(entry.entityType)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Описание</dt>
                  <dd className="text-foreground break-words">
                    {localizeAuditSummary(entry.summary)}
                  </dd>
                </div>
              </dl>
            </section>

            <AuditDetailFields
              title={detail.fieldsTitle}
              rows={detail.mainRows}
              mode={mode}
              technicalRows={detail.technicalRows}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
