import { MapPinned, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
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
  useUpdateField,
} from '@/features/fields/hooks'
import type { FieldFormValues } from '@/features/fields/schemas'
import type { FieldResponse } from '@/features/fields/types'
import { FieldCard } from './FieldCard'
import { FieldFormDialog } from './FieldFormDialog'
import { FieldHarvestModal } from './FieldHarvestModal'
import { FieldsMap } from './FieldsMap'
import { SharingCreateModal } from './SharingCreateModal'

const VIEW_OPTIONS = [
  { value: 'list' as const, label: 'Список' },
  { value: 'map' as const, label: 'Карта' },
]

export function FieldsPage() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  const { data: fields = [], isLoading, isError } = useFields()
  const createField = useCreateField()
  const updateField = useUpdateField()
  const deleteField = useDeleteField()

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

  const handleSubmit = async (values: FieldFormValues) => {
    if (editing) {
      await updateField.mutateAsync({ id: editing.id, values })
    } else {
      await createField.mutateAsync(values)
    }
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">Поля</h1>
          <p className="text-sm text-muted-foreground">
            Список и карта участков: культура, площадь, контур и сбор урожая.
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

      <SegmentedControl
        value={view}
        onChange={setView}
        options={VIEW_OPTIONS}
        size="lg"
        ariaLabel="Вид полей"
        className="max-w-md"
      />

      {view === 'list' ? (
        <div className="mt-1">
          {fields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Пока нет полей"
              description="Добавьте первое поле — название, культура и площадь."
              action={canManage ? { label: 'Добавить поле', onClick: openCreate } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  canManage={canManage}
                  canDelete={canDelete}
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
          )}
        </div>
      ) : (
        <div className="mt-1">
          {fields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Нет полей для карты"
              description="Добавьте поле с контуром или точкой."
            />
          ) : (
            <FieldsMap fields={fields} />
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
