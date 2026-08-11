import { Info, Pencil, Plus, Sprout, UserCheck, UserX } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/shared/EmptyState'
import { CardActionsMenu } from '@/components/shared/CardActionsMenu'
import { SkeletonTable } from '@/components/shared/SkeletonTable'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ActiveStatusBadge } from '@/features/settings/components/StatusControls'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  useCreateCropVariety,
  useCropVarieties,
  useCropVarietyUsage,
  useUpdateCropVariety,
  type CropVariety,
} from '../cropVarietyHooks'
import { CropVarietyFormPanel } from './CropVarietyFormPanel'

type CropVarietiesSheetProps = {
  open: boolean
  cropCode: string
  cropName: string
  onClose: () => void
}

export function CropVarietiesSheet({
  open,
  cropCode,
  cropName,
  onClose,
}: CropVarietiesSheetProps) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const { data: items = [], isLoading, isError, refetch } = useCropVarieties(cropCode, {
    activeOnly: false,
    enabled: open,
  })
  const createItem = useCreateCropVariety()
  const updateItem = useUpdateCropVariety(cropCode)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CropVariety | null>(null)
  const [name, setName] = useState('')
  const [usageId, setUsageId] = useState<string | null>(null)
  const { data: usage } = useCropVarietyUsage(usageId)
  const usageItem = items.find((i) => i.id === usageId)

  const openCreate = () => {
    setUsageId(null)
    setEditing(null)
    setName('')
    setFormOpen(true)
  }

  const openEdit = (item: CropVariety) => {
    setUsageId(null)
    setEditing(item)
    setName(item.name)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setName('')
  }

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    void (async () => {
      try {
        if (editing) await updateItem.mutateAsync({ id: editing.id, name: trimmed })
        else await createItem.mutateAsync({ cropCode, name: trimmed })
        closeForm()
      } catch {
        // toast via mutation
      }
    })()
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Сорта — {cropName}</SheetTitle>
          <SheetDescription>
            Сорта принадлежат этой культуре. Без культуры создать сорт нельзя.
          </SheetDescription>
        </SheetHeader>

        {formOpen ? (
          <CropVarietyFormPanel
            editing={editing}
            name={name}
            onNameChange={setName}
            existingNames={items.map((i) => i.name)}
            pending={createItem.isPending || updateItem.isPending}
            onSave={save}
            onCancel={closeForm}
          />
        ) : (
          <div className="flex justify-end">
            <Button
              type="button"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Добавить сорт
            </Button>
          </div>
        )}

        {usageId ? (
          <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
            <p className="font-medium text-foreground">
              Где используется{usageItem ? `: ${usageItem.name}` : ''}
            </p>
            <p className="text-muted-foreground">
              {usage == null
                ? 'Загрузка…'
                : usage.total === 0
                  ? 'Сорт пока нигде не используется. Выбор в полях и отгрузках — в следующих обновлениях.'
                  : `Поля: ${usage.fields}, склад: ${usage.inventory}, отгрузки: ${usage.shipments}, заявки: ${usage.shipmentRequests}.`}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setUsageId(null)}>
              Скрыть
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <SkeletonTable rows={3} columns={2} />
        ) : isError ? (
          <EmptyState
            icon={Sprout}
            title="Не удалось загрузить сорта"
            action={{ label: 'Повторить', onClick: () => void refetch() }}
          />
        ) : items.length === 0 && !formOpen ? (
          <EmptyState
            icon={Sprout}
            title="Сортов пока нет"
            description="Добавьте сорт, если ведёте сортовой учёт."
            action={{ label: 'Добавить сорт', onClick: openCreate }}
          />
        ) : items.length > 0 ? (
          <ul className="min-w-0 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 items-start justify-between gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <div className="mt-1.5">
                    <ActiveStatusBadge isActive={item.isActive} />
                  </div>
                </div>
                <CardActionsMenu
                  title={item.name}
                  ariaLabel="Действия"
                  elevated
                  actions={[
                    {
                      id: 'edit',
                      label: 'Переименовать',
                      icon: Pencil,
                      onSelect: () => openEdit(item),
                    },
                    {
                      id: 'usage',
                      label: 'Где используется',
                      icon: Info,
                      onSelect: () => {
                        setFormOpen(false)
                        setUsageId(item.id)
                      },
                    },
                    {
                      id: 'toggle',
                      label: item.isActive ? 'Деактивировать' : 'Активировать',
                      icon: item.isActive ? UserX : UserCheck,
                      onSelect: () =>
                        updateItem.mutate({ id: item.id, is_active: !item.isActive }),
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
