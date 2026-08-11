import { MapPinned, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { ListSearchField } from '@/components/shared/ListSearchField'
import { LoadMoreButton } from '@/components/shared/LoadMoreButton'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { RoleSectionHelp } from '@/features/help/components/RoleSectionHelp'
import { fieldsHelp } from '@/features/help/content'
import {
  useCreateField,
  useDeleteField,
  useFields,
  useSeasonPlantingOverlays,
  useUpdateField,
} from '@/features/fields/hooks'
import { filterFieldsBySearch } from '@/features/fields/fieldSearch'
import type { FieldFormValues } from '@/features/fields/schemas'
import type { FieldResponse } from '@/features/fields/types'
import { useListSearch } from '@/hooks/useListSearch'
import { usePagedItems } from '@/hooks/usePagedItems'
import { FieldCard } from './FieldCard'
import { FieldFormDialog } from './FieldFormDialog'
import { FieldHarvestModal } from './FieldHarvestModal'
import { FieldsMap } from './FieldsMap'
import { SharingCreateModal } from './SharingCreateModal'

const VIEW_OPTIONS = [
  { value: 'list' as const, label: 'Список' },
  { value: 'map' as const, label: 'Карта' },
]

type FieldsPageProps = {
  search?: string
  onSearchChange?: (search: string) => void
}

export function FieldsPage({ search = '', onSearchChange }: FieldsPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  const { searchInput, setSearchInput, debouncedSearch } = useListSearch({
    search,
    onSearchChange,
  })

  const { data: fields = [], isLoading, isError } = useFields()
  const { data: seasonPlantings = [] } = useSeasonPlantingOverlays()
  const createField = useCreateField()
  const updateField = useUpdateField()
  const deleteField = useDeleteField()

  const plantingsByField = useMemo(() => {
    const map = new Map<string, typeof seasonPlantings>()
    for (const row of seasonPlantings) {
      const list = map.get(row.fieldId) ?? []
      list.push(row)
      map.set(row.fieldId, list)
    }
    return map
  }, [seasonPlantings])

  const filteredFields = useMemo(
    () => filterFieldsBySearch(fields, debouncedSearch),
    [fields, debouncedSearch],
  )
  const fieldsPage = usePagedItems(filteredFields, `fields|${debouncedSearch}`)

  const [view, setView] = useState<'list' | 'map'>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FieldResponse | null>(null)
  const [shareField, setShareField] = useState<FieldResponse | null>(null)
  const [harvestField, setHarvestField] = useState<FieldResponse | null>(null)

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить поля')
  }, [isError])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openField = (field: FieldResponse) => {
    void navigate({ to: '/fields/$fieldId', params: { fieldId: field.id } })
  }

  const handleSubmit = async (values: FieldFormValues) => {
    if (editing) {
      await updateField.mutateAsync({ id: editing.id, values })
    } else {
      const created = await createField.mutateAsync(values)
      setFormOpen(false)
      void navigate({
        to: '/fields/$fieldId',
        params: { fieldId: created.id },
        search: { addPlanting: true },
      })
    }
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Поля</h1>
          <p className="text-sm text-muted-foreground">
            Участки хозяйства: контур, площадь и культуры/посевы по сезонам.
          </p>
        </div>
        {canManage ? (
          <Button
            type="button"
            className="min-h-11 w-full shrink-0 bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10 sm:w-auto"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Добавить поле
          </Button>
        ) : null}
      </div>

      <RoleSectionHelp
        section="поля"
        items={fieldsHelp}
        guideSection="fields"
        summary="Откройте поле в списке или на карте. Основные действия — урожай и редактирование; остальное — в «Ещё»."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ListSearchField
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Поиск по названию или культуре…"
          aria-label="Поиск по полям"
          inputSize="lg"
        />
        <SegmentedControl
          value={view}
          onChange={setView}
          options={VIEW_OPTIONS}
          size="lg"
          ariaLabel="Вид полей"
          className="w-full shrink-0 sm:w-auto"
        />
      </div>

      {view === 'list' ? (
        <div className="mt-1 space-y-4">
          {fields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Пока нет полей"
              description="Добавьте первое поле — название, площадь и контур. Культуру укажите на карточке поля."
              action={canManage ? { label: 'Добавить поле', onClick: openCreate } : undefined}
            />
          ) : filteredFields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Ничего не найдено"
              description="Измените поисковый запрос."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                {fieldsPage.visible.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    seasonPlantings={plantingsByField.get(field.id) ?? []}
                    canManage={canManage}
                    canDelete={canDelete}
                    onOpen={openField}
                    onHarvest={setHarvestField}
                    onEdit={(item) => {
                      setEditing(item)
                      setFormOpen(true)
                    }}
                    onShare={setShareField}
                    onDelete={(item) => {
                      if (window.confirm(`Удалить поле «${item.name}»?`)) {
                        void deleteField.mutateAsync(item.id)
                      }
                    }}
                  />
                ))}
              </div>
              <LoadMoreButton
                shown={fieldsPage.shown}
                total={fieldsPage.total}
                hasMore={fieldsPage.hasMore}
                onLoadMore={fieldsPage.loadMore}
              />
            </>
          )}
        </div>
      ) : (
        <div className="mt-1">
          {filteredFields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title={fields.length === 0 ? 'Нет полей для карты' : 'Ничего не найдено'}
              description={
                fields.length === 0
                  ? 'Добавьте поле с контуром или точкой.'
                  : 'Измените поисковый запрос.'
              }
            />
          ) : (
            <FieldsMap fields={filteredFields} />
          )}
        </div>
      )}

      <FieldFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        field={editing}
        isPending={createField.isPending || updateField.isPending}
        onSubmit={handleSubmit}
      />

      <SharingCreateModal
        open={Boolean(shareField)}
        onOpenChange={(open) => {
          if (!open) setShareField(null)
        }}
        field={shareField}
      />

      <FieldHarvestModal
        open={Boolean(harvestField)}
        field={harvestField}
        onClose={() => setHarvestField(null)}
        onEditField={(item) => {
          setEditing(item)
          setFormOpen(true)
        }}
      />
    </div>
  )
}
