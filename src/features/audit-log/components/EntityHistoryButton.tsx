import { History } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useCurrentUser } from '@/features/auth/hooks'
import { cn } from '@/lib/utils'
import { useEntityAuditHistory } from '../hooks'
import type { AuditLogEntry } from '../types'
import { canViewAudit } from '../types'
import { AuditDiffDialog } from './AuditDiffDialog'
import { AuditLogRow } from './AuditLogRow'

/** Above Sheet (z-[1100]) so history is not trapped behind detail panels. */
const ABOVE_SHEET_Z = 'z-[1200]'

type EntityHistoryButtonProps = {
  entityType: string
  entityId: string
  title?: string
  className?: string
}

export function EntityHistoryButton({
  entityType,
  entityId,
  title = 'История',
  className,
}: EntityHistoryButtonProps) {
  const { data: user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)
  const { data: entries = [], isLoading } = useEntityAuditHistory(
    entityType,
    entityId,
    open && canViewAudit(user?.role),
  )

  if (!canViewAudit(user?.role)) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn('min-h-11 sm:min-h-10', className)}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
      >
        <History className="size-4" />
        {title}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(ABOVE_SHEET_Z, 'max-h-[85vh] overflow-y-auto sm:max-w-lg')}
          overlayClassName={ABOVE_SHEET_Z}
        >
          <DialogHeader>
            <DialogTitle>История записи</DialogTitle>
            <DialogDescription>Изменения по этой сущности</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <PageSkeleton />
          ) : entries.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              Пока нет записей в журнале
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <AuditLogRow key={entry.id} entry={entry} compact onDetails={setSelected} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AuditDiffDialog
        entry={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        elevated
      />
    </>
  )
}
