import { Plus, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { SectionHelp } from '@/components/shared/SectionHelp'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/features/auth/hooks'
import { implementsHelp } from '@/features/help/content'
import {
  useCreateImplement,
  useDeleteImplement,
  useDetachImplement,
  useImplements,
  useUpdateImplement,
} from '@/features/implements/hooks'
import type { ImplementFormValues } from '@/features/implements/schemas'
import type { ImplementResponse } from '@/features/implements/types'
import { useDictionary } from '@/features/dictionaries/hooks'
import { ImplementAttachModal } from './ImplementAttachModal'
import { ImplementCard } from './ImplementCard'
import { ImplementFormDialog } from './ImplementFormDialog'
import { ImplementMaintenanceModal } from './ImplementMaintenanceModal'
import { ImplementSharingModal } from './ImplementSharingModal'

export function ImplementsPage() {
  const { data: user } = useCurrentUser()
  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  const [category, setCategory] = useState<string | undefined>()
  const { data: categoryOptions = [] } = useDictionary('implement_category')
  const { data: items = [], isLoading, isError } = useImplements(
    category ? { category } : undefined,
  )
  const createItem = useCreateImplement()
  const updateItem = useUpdateImplement()
  const deleteItem = useDeleteImplement()
  const detachItem = useDetachImplement()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ImplementResponse | null>(null)
  const [attachItem, setAttachItem] = useState<ImplementResponse | null>(null)
  const [maintenanceItem, setMaintenanceItem] = useState<ImplementResponse | null>(null)
  const [shareItem, setShareItem] = useState<ImplementResponse | null>(null)

  useEffect(() => {
    if (isError) toast.error('Не удалось загрузить приспособления')
  }, [isError])

  const handleSubmit = async (values: ImplementFormValues) => {
    if (editing) await updateItem.mutateAsync({ id: editing.id, values })
    else await createItem.mutateAsync(values)
  }

  if (isLoading) return <PageSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Приспособления</h1>
        {canManage ? (
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Добавить приспособление
          </Button>
        ) : null}
      </div>

      <SectionHelp title="Справка: приспособления" items={implementsHelp} />

      <div className="space-y-2 max-w-xs">
        <Label>Категория</Label>
        <Select
          value={category ?? 'all'}
          onValueChange={(value) => setCategory(!value || value === 'all' ? undefined : value)}
          items={[
            { value: 'all', label: 'Все' },
            ...categoryOptions.map((option) => ({ value: option.name, label: option.name })),
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Все" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            <SelectItem value="all">Все</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.id} value={option.name}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Нет приспособлений"
          description="Добавьте первое приспособление для учёта навески."
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {items.map((item) => (
            <ImplementCard
              key={item.id}
              item={item}
              canManage={canManage}
              canDelete={canDelete}
              onEdit={(row) => {
                setEditing(row)
                setFormOpen(true)
              }}
              onAttach={setAttachItem}
              onDetach={(row) => {
                if (window.confirm(`Открепить «${row.name}»?`)) {
                  void detachItem.mutateAsync(row.id)
                }
              }}
              onMaintenance={setMaintenanceItem}
              onShare={setShareItem}
              onDelete={(row) => {
                if (window.confirm(`Удалить «${row.name}»?`)) {
                  void deleteItem.mutateAsync(row.id)
                }
              }}
            />
          ))}
        </div>
      )}

      <ImplementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        isPending={createItem.isPending || updateItem.isPending}
        onSubmit={handleSubmit}
      />
      <ImplementAttachModal
        open={Boolean(attachItem)}
        onOpenChange={(open) => {
          if (!open) setAttachItem(null)
        }}
        item={attachItem}
      />
      <ImplementMaintenanceModal
        open={Boolean(maintenanceItem)}
        onOpenChange={(open) => {
          if (!open) setMaintenanceItem(null)
        }}
        item={maintenanceItem}
      />
      <ImplementSharingModal
        open={Boolean(shareItem)}
        onOpenChange={(open) => {
          if (!open) setShareItem(null)
        }}
        item={shareItem}
      />
    </div>
  )
}
