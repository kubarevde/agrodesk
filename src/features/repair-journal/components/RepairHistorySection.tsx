import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRepairs } from '../hooks'
import { getStatusBadgeClass, STATUS_LABELS } from '../lib/labels'
import { RepairCreateDialog } from './RepairCreateDialog'
import { RepairDetailDialog } from './RepairDetailDialog'
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
  const [selected, setSelected] = useState<RepairJournalEntry | null>(null)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">История ремонтов</h2>
        <div className="flex gap-2">
          {canManage ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              + На ремонт
            </Button>
          ) : null}
          <Link to="/maintenance" className="text-sm text-primary hover:underline">
            Все записи
          </Link>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ремонтов пока не было</p>
      ) : (
        <ul className="space-y-2">
          {data.slice(0, 8).map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/30"
                onClick={() => setSelected(entry)}
              >
                <span className="text-sm text-foreground">
                  {entry.date} · {entry.type}
                  {entry.checklistTotal > 0
                    ? ` · ${entry.checklistDone}/${entry.checklistTotal}`
                    : ''}
                </span>
                <Badge variant="outline" className={getStatusBadgeClass(entry.status)}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </Badge>
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
      />
      <RepairDetailDialog
        entry={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />
    </section>
  )
}
