import { Check, Pencil, RotateCcw, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardActionsMenu, type CardActionItem } from '@/components/shared/CardActionsMenu'
import {
  assigneeLabel,
  formatTaskDate,
  TASK_STATUS_LABELS,
  type OrgTask,
} from '../types'

type Props = {
  task: OrgTask
  canComplete: boolean
  canManage: boolean
  completing?: boolean
  onComplete: () => void
  onEdit: () => void
  onCancel: () => void
  onReopen: () => void
}

function statusVariant(status: OrgTask['status']) {
  if (status === 'completed') return 'secondary' as const
  if (status === 'cancelled') return 'outline' as const
  return 'default' as const
}

export function TaskCard({
  task,
  canComplete,
  canManage,
  completing,
  onComplete,
  onEdit,
  onCancel,
  onReopen,
}: Props) {
  const menuActions: CardActionItem[] = []
  if (task.status === 'active' && canManage) {
    menuActions.push({
      id: 'edit',
      label: 'Редактировать',
      icon: Pencil,
      onSelect: onEdit,
    })
    menuActions.push({
      id: 'cancel',
      label: 'Отменить',
      icon: XCircle,
      variant: 'destructive',
      onSelect: onCancel,
    })
  }
  if (task.status === 'completed' && canManage) {
    menuActions.push({
      id: 'reopen',
      label: 'Открыть снова',
      icon: RotateCcw,
      onSelect: onReopen,
    })
  }

  return (
    <article className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(task.status)}>
              {TASK_STATUS_LABELS[task.status]}
            </Badge>
          </div>
          <h3 className="break-words text-base font-semibold text-foreground">{task.title}</h3>
          {task.description ? (
            <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground">
              {task.description}
            </p>
          ) : null}
        </div>
        {menuActions.length > 0 ? (
          <CardActionsMenu actions={menuActions} title={task.title} />
        ) : null}
      </div>

      <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
        <div>
          <dt className="sr-only">Кому</dt>
          <dd>{assigneeLabel(task)}</dd>
        </div>
        <div>
          <dt className="sr-only">Создал</dt>
          <dd>
            Создал: {task.createdByName ?? '—'} · {formatTaskDate(task.createdAt)}
          </dd>
        </div>
        {task.status === 'completed' ? (
          <div>
            <dd>
              Выполнил: {task.completedByName ?? '—'} · {formatTaskDate(task.completedAt)}
            </dd>
          </div>
        ) : null}
        {task.status === 'cancelled' ? (
          <div className="space-y-1">
            <dd className="break-words">Причина: {task.cancellationReason ?? '—'}</dd>
            <dd>
              Отменил: {task.cancelledByName ?? '—'} · {formatTaskDate(task.cancelledAt)}
            </dd>
          </div>
        ) : null}
      </dl>

      {canComplete ? (
        <Button
          type="button"
          className="mt-4 h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:w-auto"
          disabled={completing}
          onClick={onComplete}
        >
          <Check className="size-4" />
          Выполнено
        </Button>
      ) : null}
    </article>
  )
}
