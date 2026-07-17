import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { selectOptions } from '@/lib/selectOptions'
import { useRepairs } from '../hooks'
import type { RepairJournalEntry } from '../types'
import { RepairCreateDialog } from './RepairCreateDialog'
import { RepairDetailDialog } from './RepairDetailDialog'
import { RepairList } from './RepairList'
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  getPriorityBadgeClass,
  getStatusBadgeClass,
} from '../lib/labels'
import { maintenanceHelp } from '@/features/help/modules'

const STATUS_FILTER = selectOptions([
  { value: 'all', label: 'Все статусы' },
  { value: 'in_progress', label: 'В ремонте' },
  { value: 'waiting_parts', label: 'Ожидает запчасти' },
  { value: 'done', label: 'Готово' },
])

export function MaintenancePage() {
  const [status, setStatus] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<RepairJournalEntry | null>(null)
  const { data = [], isLoading, isError } = useRepairs({
    status: status === 'all' ? undefined : status,
  })
  const { data: inProgress = [] } = useRepairs({ status: 'in_progress' })
  const { data: waitingParts = [] } = useRepairs({ status: 'waiting_parts' })
  const { data: doneRepairs = [] } = useRepairs({ status: 'done' })

  const urgentCount = [...inProgress, ...waitingParts].filter((r) => r.priority === 'urgent')
    .length
  const inRepairCount = inProgress.length
  const waitingCount = waitingParts.length
  const doneCount = doneRepairs.length

  if (isLoading) return <PageSkeleton />
  if (isError) {
    return (
      <EmptyState
        icon={Wrench}
        title="Не удалось загрузить журнал ремонта"
        description="Проверьте сеть и права менеджера."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ремонт и обслуживание</h1>
          <p className="text-sm text-muted-foreground">
            Журнал постановки техники и приспособлений на ремонт с чек-листом работ и закупок.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Поставить на ремонт
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">Срочно</p>
          <Badge variant="outline" className={getPriorityBadgeClass('urgent')}>
            {PRIORITY_LABELS.urgent} · {urgentCount}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">В ремонте</p>
          <Badge variant="outline" className={getStatusBadgeClass('in_progress')}>
            {STATUS_LABELS.in_progress} · {inRepairCount}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">Ждут запчасти</p>
          <Badge variant="outline" className={getStatusBadgeClass('waiting_parts')}>
            {STATUS_LABELS.waiting_parts} · {waitingCount}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">Готово</p>
          <Badge variant="outline" className={getStatusBadgeClass('done')}>
            {STATUS_LABELS.done} · {doneCount}
          </Badge>
        </div>
      </div>

      <LabeledSelect
        className="sm:w-56"
        value={status}
        options={STATUS_FILTER}
        onValueChange={(v) => setStatus(v || 'all')}
      />

      <RepairList items={data} onOpen={setSelected} />

      <RepairCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <RepairDetailDialog
        entry={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
      />

      <SectionHelp title="Справка: ремонт и обслуживание" items={maintenanceHelp} />
    </div>
  )
}
