import { useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Wrench } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { ListSearchField } from '@/components/shared/ListSearchField'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { accessLoadErrorDescription } from '@/lib/apiError'
import { useCurrentUser } from '@/features/auth/hooks'
import { useDictionary } from '@/features/dictionaries/hooks'
import { maintenanceHelp } from '@/features/help/modules'
import { useListSearch } from '@/hooks/useListSearch'
import { useRepairs } from '../hooks'
import { filterRepairsBySearch } from '../repairSearch'
import { MaintenanceKpiStrip } from './MaintenanceKpiStrip'
import { MaintenanceListFilters } from './MaintenanceListFilters'
import { RepairCreateDialog } from './RepairCreateDialog'
import { RepairDetailDialog } from './RepairDetailDialog'
import { RepairList } from './RepairList'

const ATTENTION_FILTER = 'attention'
const maintenanceRoute = getRouteApi('/_layout/maintenance/')

export function MaintenancePage() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const { equipmentId, implementId, search = '' } = maintenanceRoute.useSearch()
  const navigate = maintenanceRoute.useNavigate()
  const { data: statusDict = [] } = useDictionary('repair_status')
  const [status, setStatus] = useState('all')
  const [waitingFilter, setWaitingFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { searchInput, setSearchInput, debouncedSearch } = useListSearch({
    search,
    onSearchChange: (next) => {
      void navigate({
        search: (prev) => ({
          ...prev,
          search: next || undefined,
        }),
        replace: true,
      })
    },
  })

  const statusFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'Все статусы' },
      { value: ATTENTION_FILTER, label: 'Требуют внимания' },
      ...statusDict.map((item) => ({ value: item.code, label: item.name })),
    ],
    [statusDict],
  )

  const listFilters = useMemo(() => {
    const waitingParts =
      waitingFilter === 'yes' ? true : waitingFilter === 'no' ? false : undefined
    const priority = priorityFilter === 'all' ? undefined : priorityFilter
    if (status === ATTENTION_FILTER) {
      return {
        attention: true as const,
        waitingParts,
        priority,
        equipmentId,
        implementId,
      }
    }
    return {
      status: status === 'all' ? undefined : status,
      waitingParts,
      priority,
      equipmentId,
      implementId,
    }
  }, [status, waitingFilter, priorityFilter, equipmentId, implementId])

  const { data = [], isLoading, isError, error } = useRepairs(listFilters)
  const filteredData = useMemo(
    () => filterRepairsBySearch(data, debouncedSearch),
    [data, debouncedSearch],
  )
  const selected = useMemo(
    () => (selectedId ? data.find((entry) => entry.id === selectedId) ?? null : null),
    [data, selectedId],
  )
  const { data: inProgress = [] } = useRepairs({
    status: 'in_progress',
    equipmentId,
    implementId,
  })
  const { data: waitingParts = [] } = useRepairs({
    waitingParts: true,
    equipmentId,
    implementId,
  })
  const { data: doneRepairs = [] } = useRepairs({ status: 'done', equipmentId, implementId })
  const { data: urgentRepairs = [] } = useRepairs({
    priority: 'urgent',
    attention: true,
    equipmentId,
    implementId,
  })

  const resetListFilters = () => {
    setStatus('all')
    setWaitingFilter('all')
    setPriorityFilter('all')
  }
  if (isLoading) return <PageSkeleton />
  if (isError) {
    const loadError = accessLoadErrorDescription(error, 'Не удалось загрузить журнал ремонта')
    return <EmptyState icon={Wrench} title={loadError.title} description={loadError.description} />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Ремонт и обслуживание</h1>
          <p className="text-sm text-muted-foreground">
            Журнал постановки техники и приспособлений на ремонт с чек-листом работ и закупок.
          </p>
        </div>
        {canManage ? (
          <Button type="button" className="min-h-11 sm:min-h-10" onClick={() => setCreateOpen(true)}>
            Поставить на ремонт
          </Button>
        ) : null}
      </div>

      {equipmentId || implementId ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-muted-foreground">
          <span>
            {equipmentId
              ? 'Показаны записи по выбранной технике.'
              : 'Показаны записи по выбранному приспособлению.'}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  equipmentId: undefined,
                  implementId: undefined,
                }),
                replace: true,
              })
            }
          >
            Показать все
          </Button>
        </div>
      ) : null}

      <MaintenanceKpiStrip
        urgentCount={urgentRepairs.length}
        inRepairCount={inProgress.length}
        waitingCount={waitingParts.length}
        doneCount={doneRepairs.length}
        statusDict={statusDict}
        onFilterUrgent={() => {
          resetListFilters()
          setPriorityFilter('urgent')
          setStatus(ATTENTION_FILTER)
        }}
        onFilterInRepair={() => {
          resetListFilters()
          setStatus('in_progress')
        }}
        onFilterWaitingParts={() => {
          resetListFilters()
          setWaitingFilter('yes')
        }}
        onFilterDone={() => {
          resetListFilters()
          setStatus('done')
        }}
      />
      <ListSearchField
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Поиск по технике, типу или описанию…"
        aria-label="Поиск по ремонтам"
        className="sm:max-w-md"
      />
      <MaintenanceListFilters
        status={status}
        waitingFilter={waitingFilter}
        statusOptions={statusFilterOptions}
        onStatusChange={setStatus}
        onWaitingChange={setWaitingFilter}
      />

      <RepairList
        items={filteredData}
        onOpen={(entry) => setSelectedId(entry.id)}
        emptyMessage={
          debouncedSearch
            ? 'Ничего не найдено. Измените поисковый запрос.'
            : undefined
        }
      />

      {canManage ? (
        <RepairCreateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          defaultEquipmentId={equipmentId}
          defaultImplementId={implementId}
          lockAsset={Boolean(equipmentId || implementId)}
        />
      ) : null}
      <RepairDetailDialog
        entry={selected}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
      />

      <SectionHelp section="ремонт" items={maintenanceHelp} />
    </div>
  )
}
