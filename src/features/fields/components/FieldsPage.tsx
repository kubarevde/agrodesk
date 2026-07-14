import { List, Map as MapIcon, MapPinned, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/features/auth/hooks'
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
import { FieldsMap } from './FieldsMap'
import { SharingCreateModal } from './SharingCreateModal'

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Поля</h1>
        {canManage ? (
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Добавить поле
          </Button>
        ) : null}
      </div>

      <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'map')}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="size-4" />
            Список
          </TabsTrigger>
          <TabsTrigger value="map">
            <MapIcon className="size-4" />
            Карта
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {fields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Пока нет полей"
              description="Добавьте первое поле, чтобы вести учёт культуры и площади."
              action={canManage ? { label: 'Добавить поле', onClick: openCreate } : undefined}
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  canManage={canManage}
                  canDelete={canDelete}
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
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          {fields.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title="Нет полей для карты"
              description="Добавьте поле с координатами."
            />
          ) : (
            <FieldsMap fields={fields} />
          )}
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
