import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TaskStatus } from '../types'

type StatusTab = TaskStatus
type ScopeTab = 'all' | 'my' | 'general'

type Props = {
  statusTab: StatusTab
  onStatusChange: (value: StatusTab) => void
  showScope: boolean
  scopeTab: ScopeTab
  onScopeChange: (value: ScopeTab) => void
}

export function TaskListFilters({
  statusTab,
  onStatusChange,
  showScope,
  scopeTab,
  onScopeChange,
}: Props) {
  const triggerClass =
    'min-h-10 min-w-0 px-1 py-2 text-center text-xs leading-tight whitespace-normal sm:px-2 sm:text-sm'

  return (
    <div className="min-w-0 space-y-3">
      <Tabs value={statusTab} onValueChange={(v) => onStatusChange(v as StatusTab)} className="min-w-0">
        <TabsList className="grid h-auto min-h-11 w-full min-w-0 grid-cols-3 gap-0.5 p-1">
          <TabsTrigger value="active" className={triggerClass}>
            Активные
          </TabsTrigger>
          <TabsTrigger value="completed" className={triggerClass}>
            Выполненные
          </TabsTrigger>
          <TabsTrigger value="cancelled" className={triggerClass}>
            Отменённые
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {showScope ? (
        <Tabs value={scopeTab} onValueChange={(v) => onScopeChange(v as ScopeTab)} className="min-w-0">
          <TabsList className="grid h-auto min-h-11 w-full min-w-0 grid-cols-3 gap-0.5 p-1">
            <TabsTrigger value="all" className={triggerClass}>
              Все доступные
            </TabsTrigger>
            <TabsTrigger value="my" className={triggerClass}>
              Мне назначены
            </TabsTrigger>
            <TabsTrigger value="general" className={triggerClass}>
              Общие
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
    </div>
  )
}
