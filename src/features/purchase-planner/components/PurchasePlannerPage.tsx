import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { purchasePlannerHelp } from '@/features/help/modules'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { selectOptions } from '@/lib/selectOptions'
import { useEmployees } from '@/features/employees/hooks'
import { usePurchaseItems } from '../hooks'
import { purchasePlannerSearch } from '../lib/plannerSearch'
import { PurchaseChecklistView } from './PurchaseChecklistView'
import { PurchaseFormDialog } from './PurchaseFormDialog'
import { PurchaseManageView } from './PurchaseManageView'
import { PurchasePlannerFilterBanner } from './PurchasePlannerFilterBanner'

type PurchaseStatus = 'planned' | 'purchased' | 'cancelled'
type PlannerMode = 'manage' | 'checklist'

const MODE_OPTIONS = [
  { value: 'checklist' as const, label: 'На закупку' },
  { value: 'manage' as const, label: 'Управление' },
]

const URGENCY_FILTER = selectOptions([
  { value: 'all', label: 'Любая срочность' },
  { value: 'urgent', label: 'Срочно' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low', label: 'Низкий' },
])

const CATEGORY_FILTER = selectOptions([
  { value: 'all', label: 'Все категории' },
  { value: 'equipment', label: 'Техника' },
  { value: 'implement', label: 'Приспособление' },
  { value: 'inventory_item', label: 'ТМЦ' },
  { value: 'general', label: 'Общее' },
])

export function PurchasePlannerPage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    mode?: PlannerMode
    equipmentId?: string
    implementId?: string
    maintenanceId?: string
  }
  const mode: PlannerMode = search.mode === 'checklist' ? 'checklist' : 'manage'
  const [status, setStatus] = useState<PurchaseStatus>('planned')
  const [urgency, setUrgency] = useState('all')
  const [category, setCategory] = useState('all')
  const [responsibleId, setResponsibleId] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const { data: employees = [] } = useEmployees()

  const assetFilters = {
    equipmentId: search.equipmentId,
    implementId: search.implementId,
    maintenanceId: search.maintenanceId,
  }

  const { data = [], isLoading, isError } = usePurchaseItems({
    status,
    urgency: urgency === 'all' ? undefined : urgency,
    category: category === 'all' ? undefined : category,
    responsibleId: responsibleId === 'all' ? undefined : responsibleId,
    ...assetFilters,
  })

  const setMode = (next: PlannerMode) => {
    void navigate({
      to: '/purchase-planner',
      search: purchasePlannerSearch({
        mode: next === 'checklist' ? 'checklist' : undefined,
        equipmentId: search.equipmentId,
        implementId: search.implementId,
        maintenanceId: search.maintenanceId,
      }),
    })
  }

  if (isLoading && mode === 'manage') return <PageSkeleton />
  if (isError) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Не удалось загрузить планировщик"
        description="Проверьте сеть и права доступа."
      />
    )
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Планировщик закупок</h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'checklist'
            ? 'Чеклист для похода в магазин — отмечайте купленное.'
            : 'Учёт и фильтры по статусам закупок.'}
        </p>
      </header>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={MODE_OPTIONS}
        size="lg"
        ariaLabel="Режим планировщика"
      />

      <PurchasePlannerFilterBanner filters={assetFilters} mode={mode} />

      {mode === 'checklist' ? (
        <PurchaseChecklistView assetFilters={assetFilters} />
      ) : (
        <PurchaseManageView
          items={data}
          status={status}
          onStatusChange={setStatus}
          urgency={urgency}
          onUrgencyChange={setUrgency}
          category={category}
          onCategoryChange={setCategory}
          responsibleId={responsibleId}
          onResponsibleChange={setResponsibleId}
          urgencyOptions={URGENCY_FILTER}
          categoryOptions={CATEGORY_FILTER}
          responsibleOptions={selectOptions([
            { value: 'all', label: 'Любой' },
            ...employees.map((e) => ({ value: e.id, label: e.employeeName })),
          ])}
          onAdd={() => setCreateOpen(true)}
        />
      )}

      <SectionHelp title="Справка: планировщик закупок" items={purchasePlannerHelp} />
      <PurchaseFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
