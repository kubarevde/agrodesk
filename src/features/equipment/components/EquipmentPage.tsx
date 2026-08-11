import { Plus, Tractor } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ListSearchField } from '@/components/shared/ListSearchField'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import {
  useCreateEquipment,
  useEquipment,
  useUpdateEquipment,
} from '@/features/equipment/hooks'
import { filterEquipmentBySearch } from '@/features/equipment/equipmentSearch'
import type { EquipmentFormValues } from '@/features/equipment/schemas'
import type { EquipmentDetail } from '@/features/equipment/types'
import { equipmentHelp } from '@/features/help/content'
import { useImplements } from '@/features/implements/hooks'
import { useListSearch } from '@/hooks/useListSearch'
import { EquipmentCard } from './EquipmentCard'
import { EquipmentFormDialog } from './EquipmentFormDialog'
import { EquipmentHubShell } from './EquipmentHubShell'
import { EquipmentMap } from './EquipmentMap'
import { EquipmentSharingModal } from './EquipmentSharingModal'

const VIEW_OPTIONS = [
  { value: 'list' as const, label: 'Список' },
  { value: 'map' as const, label: 'Карта' },
]

type EquipmentPageProps = {
  search?: string
  onSearchChange?: (search: string) => void
}

export function EquipmentPage({ search = '', onSearchChange }: EquipmentPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const canDeactivate = user?.role === 'admin'

  const { searchInput, setSearchInput, debouncedSearch } = useListSearch({
    search,
    onSearchChange,
  })

  const { data: items = [], isLoading, isError } = useEquipment({ is_active: true })
  const { data: allImplements = [] } = useImplements()
  const createItem = useCreateEquipment()
  const updateItem = useUpdateEquipment()

  const [view, setView] = useState<'list' | 'map'>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EquipmentDetail | null>(null)
  const [shareItem, setShareItem] = useState<EquipmentDetail | null>(null)

  const implementsByEquipment = useMemo(() => {
    const map: Record<string, typeof allImplements> = {}
    for (const row of allImplements) {
      if (!row.current_equipment_id) continue
      const list = map[row.current_equipment_id] ?? []
      list.push(row)
      map[row.current_equipment_id] = list
    }
    return map
  }, [allImplements])

  const filteredItems = useMemo(
    () => filterEquipmentBySearch(items, debouncedSearch, implementsByEquipment),
    [items, debouncedSearch, implementsByEquipment],
  )

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить технику')
  }, [isError])

  const handleSubmit = async (values: EquipmentFormValues) => {
    if (editing) await updateItem.mutateAsync({ id: editing.id, values })
    else await createItem.mutateAsync(values)
  }

  if (isLoading) return <PageSkeleton />

  return (
    <EquipmentHubShell
      active="equipment"
      title="Техника и приспособления"
      actions={
        canManage ? (
          <Button
            type="button"
            className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10 sm:w-auto"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Добавить технику
          </Button>
        ) : null
      }
    >
      <RoleSectionHelp section="техника" items={equipmentHelp} guideSection="equipment" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ListSearchField
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Поиск по названию, типу или номеру…"
          aria-label="Поиск по технике"
          inputSize="lg"
        />
        <SegmentedControl
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS}
          size="lg"
          ariaLabel="Вид техники"
          className="w-full shrink-0 sm:w-auto"
        />
      </div>

      {view === 'list' ? (
        <div className="mt-1">
          {items.length === 0 ? (
            <EmptyState
              icon={Tractor}
              title="Нет техники"
              description="Добавьте первую единицу техники для учёта счётчиков и ТО."
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Tractor}
              title="Ничего не найдено"
              description="Измените поисковый запрос."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:gap-4">
              {filteredItems.map((item) => (
                <EquipmentCard
                  key={item.id}
                  item={item}
                  implements={implementsByEquipment[item.id] ?? []}
                  canManage={canManage}
                  canDeactivate={canDeactivate}
                  onDetails={(row) => {
                    void navigate({
                      to: '/equipment/$equipmentId',
                      params: { equipmentId: row.id },
                    })
                  }}
                  onEdit={(row) => {
                    setEditing(row)
                    setFormOpen(true)
                  }}
                  onShare={setShareItem}
                  onDeactivate={(row) => {
                    if (window.confirm(`Деактивировать «${row.name}»?`)) {
                      void updateItem.mutateAsync({
                        id: row.id,
                        values: { is_active: false },
                      })
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-1">
          {filteredItems.length === 0 && debouncedSearch ? (
            <EmptyState
              icon={Tractor}
              title="Ничего не найдено"
              description="Измените поисковый запрос."
            />
          ) : (
            <EquipmentMap items={filteredItems} implementsByEquipment={implementsByEquipment} />
          )}
        </div>
      )}

      <EquipmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        isPending={createItem.isPending || updateItem.isPending}
        onSubmit={handleSubmit}
      />
      <EquipmentSharingModal
        open={Boolean(shareItem)}
        onOpenChange={(open) => {
          if (!open) setShareItem(null)
        }}
        item={shareItem}
      />
    </EquipmentHubShell>
  )
}
