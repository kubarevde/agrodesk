import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { InventoryItem } from '@/types'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  useCreateInventoryItem,
  useUpdateInventoryItem,
} from '@/features/inventory/hooks'
import {
  inventoryItemSchema,
  type InventoryItemFormValues,
} from '@/features/inventory/schemas'
import { ActiveToggle } from '@/features/settings/components/StatusControls'

interface InventoryItemFormModalProps {
  open: boolean
  item?: InventoryItem | null
  onClose: () => void
}

const defaults: InventoryItemFormValues = {
  name: '',
  category: 'fuel',
  unit: 'л',
  currentStock: 0,
  minStock: 0,
  totalCapacity: 0,
  isActive: true,
}

export function InventoryItemFormModal({ open, item, onClose }: InventoryItemFormModalProps) {
  const isEdit = Boolean(item)
  const createItem = useCreateInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const { data: categories = [] } = useDictionary('inventory_category')
  // Stable primitive — avoid putting `categories` array in effect deps (new [] each render → loop)
  const firstCategoryCode = categories[0]?.code

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: defaults,
  })

  const categoryItems = useMemo(() => {
    const rows = categories.map((row) => ({ value: row.code, label: row.name }))
    if (item?.category && !rows.some((row) => row.value === item.category)) {
      return [{ value: item.category, label: item.category }, ...rows]
    }
    return rows
  }, [categories, item?.category])

  // Reset only when dialog opens / edited item changes — never depend on `categories` array
  // (default `[]` is a new reference every render and caused Maximum update depth exceeded).
  useEffect(() => {
    if (!open) {
      reset(defaults)
      return
    }
    reset(
      item
        ? {
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentStock: item.currentStock,
            minStock: item.minStock,
            totalCapacity: item.totalCapacity,
            isActive: item.isActive,
          }
        : {
            ...defaults,
            category: firstCategoryCode ?? 'fuel',
          },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- firstCategoryCode read at open time only
  }, [item?.id, open, reset])

  const pending = isSubmitting || createItem.isPending || updateItem.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать позицию' : 'Добавить позицию ТМЦ'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            if (item) {
              await updateItem.mutateAsync({
                id: item.id,
                name: values.name,
                category: values.category,
                unit: values.unit,
                minStock: values.minStock,
                totalCapacity: values.totalCapacity,
                isActive: values.isActive,
              })
            } else {
              await createItem.mutateAsync(values)
            }
            onClose()
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="inv-name">Название</Label>
            <Input id="inv-name" {...register('name')} />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={categoryItems}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {categoryItems.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Категории задаются в Настройках → Категории ТМЦ
            </p>
            <ManageInSettingsLink tabHint="категории ТМЦ" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-unit">Ед. изм.</Label>
            <Input id="inv-unit" {...register('unit')} />
            {errors.unit ? (
              <p className="text-xs text-destructive">{errors.unit.message}</p>
            ) : null}
          </div>

          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="inv-stock">Текущий остаток</Label>
              <Input
                id="inv-stock"
                type="number"
                min={0}
                step="any"
                {...register('currentStock', { valueAsNumber: true })}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="inv-min">Мин. запас</Label>
            <Input
              id="inv-min"
              type="number"
              min={0}
              step="any"
              {...register('minStock', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-capacity">Ёмкость</Label>
            <Input
              id="inv-capacity"
              type="number"
              min={0}
              step="any"
              {...register('totalCapacity', { valueAsNumber: true })}
            />
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <ActiveToggle value={field.value} onChange={field.onChange} />
            )}
          />

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isEdit ? 'Сохранить' : 'Добавить позицию'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
