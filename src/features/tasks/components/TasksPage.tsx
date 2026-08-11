import { useMemo, useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { tasksHelp } from '@/features/help/content'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import {
  useCancelTask,
  useCompleteTask,
  useCreateTask,
  useReopenTask,
  useTasks,
  useUpdateTask,
} from '../hooks'
import { canCompleteTaskUi, useTaskPermissions } from '../permissions'
import type { TaskFormValues } from '../schemas'
import type { OrgTask, TaskStatus } from '../types'
import { TaskCancelModal } from './TaskCancelModal'
import { TaskCard } from './TaskCard'
import { TaskFormModal } from './TaskFormModal'
import { TaskListFilters } from './TaskListFilters'

type StatusTab = TaskStatus
type ScopeTab = 'all' | 'my' | 'general'

export function TasksPage({ embedded = false }: { embedded?: boolean }) {
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions()
  const rights = useTaskPermissions(user, perms)
  const [statusTab, setStatusTab] = useState<StatusTab>('active')
  const [scopeTab, setScopeTab] = useState<ScopeTab>('all')
  const filters = useMemo(
    () => ({
      status: statusTab,
      scope: rights.canViewAll ? ('all' as const) : scopeTab,
    }),
    [rights.canViewAll, scopeTab, statusTab],
  )
  const { data: tasks = [], isLoading } = useTasks(filters)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const completeTask = useCompleteTask()
  const reopenTask = useReopenTask()
  const cancelTask = useCancelTask()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<OrgTask | null>(null)
  const [cancelTarget, setCancelTarget] = useState<OrgTask | null>(null)

  const emptyTitle =
    statusTab === 'active'
      ? 'Активных задач нет'
      : statusTab === 'completed'
        ? 'Выполненных задач нет'
        : 'Отменённых задач нет'

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const onSave = (values: TaskFormValues) => {
    if (editing) {
      updateTask.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            setFormOpen(false)
            setEditing(null)
          },
        },
      )
      return
    }
    createTask.mutate(values, { onSuccess: () => setFormOpen(false) })
  }

  return (
    <div className={embedded ? 'space-y-6 overflow-x-hidden' : 'mx-auto w-full max-w-3xl space-y-6 overflow-x-hidden'}>
      {embedded ? null : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">Задачи</h1>
            <p className="text-sm text-muted-foreground">
              Текущие поручения и хозяйственные задачи организации
            </p>
          </div>
          {rights.canCreate ? (
            <Button
              type="button"
              className="h-11 w-full shrink-0 bg-primary hover:bg-primary-hover sm:w-auto"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Создать задачу
            </Button>
          ) : null}
        </div>
      )}

      {embedded && rights.canCreate ? (
        <div className="flex justify-end">
          <Button
            type="button"
            className="h-11 w-full shrink-0 bg-primary hover:bg-primary-hover sm:w-auto"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Создать задачу
          </Button>
        </div>
      ) : null}

      {embedded ? null : (
        <RoleSectionHelp section="задачи" items={tasksHelp} guideSection="tasks" />
      )}

      <TaskListFilters
        statusTab={statusTab}
        onStatusChange={setStatusTab}
        showScope={!rights.canViewAll}
        scopeTab={scopeTab}
        onScopeChange={setScopeTab}
      />

      {isLoading ? (
        <PageSkeleton />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={emptyTitle}
          description="Задачи — для текущих поручений, не связанных с агрокалендарём и сменами"
          action={
            rights.canCreate && statusTab === 'active'
              ? { label: 'Создать задачу', onClick: openCreate }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id} className="min-w-0">
              <TaskCard
                task={task}
                canComplete={canCompleteTaskUi(task, user?.id, rights)}
                canManage={rights.canManage}
                completing={completeTask.isPending}
                onComplete={() => completeTask.mutate(task.id)}
                onEdit={() => {
                  setEditing(task)
                  setFormOpen(true)
                }}
                onCancel={() => setCancelTarget(task)}
                onReopen={() => reopenTask.mutate(task.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {rights.canCreate || rights.canManage ? (
        <TaskFormModal
          open={formOpen}
          task={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSubmit={onSave}
          saving={createTask.isPending || updateTask.isPending}
        />
      ) : null}

      <TaskCancelModal
        open={Boolean(cancelTarget)}
        title={cancelTarget?.title ?? ''}
        onClose={() => setCancelTarget(null)}
        saving={cancelTask.isPending}
        onSubmit={(reason) => {
          if (!cancelTarget) return
          cancelTask.mutate(
            { id: cancelTarget.id, reason },
            { onSuccess: () => setCancelTarget(null) },
          )
        }}
      />
    </div>
  )
}
