import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRepairs } from '../hooks'
import { RepairCreateDialog } from './RepairCreateDialog'
import { RepairDetailDialog } from './RepairDetailDialog'
import { RepairStatusBadges } from './RepairStatusBadges'
import type { RepairJournalEntry } from '../types'

type RepairHistorySectionProps = {
  equipmentId?: string
  implementId?: string
  canManage?: boolean
}

export function RepairHistorySection({
  equipmentId,
  implementId,
  canManage = false,
}: RepairHistorySectionProps) {
  const { data = [], isLoading } = useRepairs({
    equipmentId,
    implementId,
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(
    () => (selectedId ? data.find((entry) => entry.id === selectedId) ?? null : null),
    [data, selectedId],
  )

  return (
    <section className="space-y-2.5 rounded-lg border border-border bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">История ремонтов</h2>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-10"
              onClick={() => setCreateOpen(true)}
            >
              + На ремонт
            </Button>
          ) : null}
          <Link
            to="/maintenance"
            search={
              equipmentId
                ? { equipmentId }
                : implementId
                  ? { implementId }
                  : undefined
            }
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'min-h-11 sm:min-h-10',
            )}
          >
            Все записи
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ремонтов пока не было</p>
      ) : (
        <ul className="space-y-1.5">
          {data.slice(0, 8).map((entry: RepairJournalEntry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2 text-left hover:bg-muted/30"
                onClick={() => setSelectedId(entry.id)}
              >
                <span className="text-sm text-foreground">
                  {entry.date} · {entry.type}
                  {entry.checklistTotal > 0
                    ? ` · ${entry.checklistDone}/${entry.checklistTotal}`
                    : ''}
                </span>
                <RepairStatusBadges status={entry.status} waitingParts={entry.waitingParts} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <RepairCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultEquipmentId={equipmentId}
        defaultImplementId={implementId}
        lockAsset
      />
      <RepairDetailDialog
        entry={selected}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
      />
    </section>
  )
}
