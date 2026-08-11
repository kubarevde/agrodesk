import { useNavigate } from '@tanstack/react-router'
import { CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTasks } from '../hooks'
import { formatTaskDate, TASK_STATUS_LABELS } from '../types'

type Props = {
  employeeId: string
  enabled?: boolean
}

/** Admin/manager block on employee card — personal tasks only. */
export function EmployeeTasksBlock({ employeeId, enabled = true }: Props) {
  const navigate = useNavigate()
  const { data: active = [], isLoading: loadingActive } = useTasks(
    { status: 'active', scope: 'all', assigneeId: employeeId },
    enabled,
  )
  const { data: done = [], isLoading: loadingDone } = useTasks(
    { status: 'completed', scope: 'all', assigneeId: employeeId },
    enabled,
  )

  const personalActive = active.filter(
    (t) => t.visibilityType === 'specific_employee' && t.assigneeId === employeeId,
  )
  const personalDone = done
    .filter((t) => t.visibilityType === 'specific_employee' && t.assigneeId === employeeId)
    .slice(0, 3)

  if (loadingActive || loadingDone) {
    return <div className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
  }

  return (
    <section className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CheckSquare className="size-4 text-primary" />
          Задачи
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            void navigate({ to: '/workspace', search: { tab: 'tasks' } })
          }
        >
          Все задачи
        </Button>
      </div>
      {personalActive.length === 0 && personalDone.length === 0 ? (
        <p className="text-sm text-muted-foreground">Персональных задач нет</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {personalActive.map((task) => (
            <li key={task.id} className="min-w-0 break-words">
              <span className="font-medium text-foreground">{task.title}</span>
              <span className="text-muted-foreground"> · {TASK_STATUS_LABELS.active}</span>
            </li>
          ))}
          {personalDone.map((task) => (
            <li key={task.id} className="min-w-0 break-words text-muted-foreground">
              {task.title} · {TASK_STATUS_LABELS.completed} · {formatTaskDate(task.completedAt)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
