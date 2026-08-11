import { useNavigate } from '@tanstack/react-router'
import { Check, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { hasSection } from '@/lib/permissionActions'
import { useCompleteTask, useTasks } from '../hooks'
import { canCompleteTaskUi, useTaskPermissions } from '../permissions'
import { assigneeLabel } from '../types'

const PREVIEW_LIMIT = 5

/** Compact active tasks block for «Моя смена». */
export function MyTasksBlock() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const sectionOk = hasSection(perms?.allowedSections, 'tasks', user?.role)
  const rights = useTaskPermissions(user, perms)
  const { data: tasks = [], isLoading } = useTasks(
    { status: 'active', scope: 'all' },
    sectionOk,
  )
  const completeTask = useCompleteTask()
  const preview = tasks.slice(0, PREVIEW_LIMIT)

  if (!sectionOk) return null
  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
  }
  if (preview.length === 0) return null

  return (
    <section className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CheckSquare className="size-4 text-primary" />
          Мои задачи
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() =>
            void navigate({ to: '/workspace', search: { tab: 'tasks' } })
          }
        >
          Открыть задачи
        </Button>
      </div>
      <ul className="space-y-2">
        {preview.map((task) => {
          const canComplete = canCompleteTaskUi(task, user?.id, rights)
          return (
            <li
              key={task.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground">{assigneeLabel(task)}</p>
              </div>
              {canComplete ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-10 w-full shrink-0 bg-primary hover:bg-primary-hover sm:w-auto"
                  disabled={completeTask.isPending}
                  onClick={() => completeTask.mutate(task.id)}
                >
                  <Check className="size-4" />
                  Выполнено
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
