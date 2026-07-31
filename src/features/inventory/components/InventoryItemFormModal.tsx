import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { isHarvestCategory } from '@/features/inventory/utils'
import { asCropCode } from '@/features/inventory/inventoryItemPayload'
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
import { buildDictionarySelectOptions } from '@/features/dictionaries/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import {
  useCreateInventoryItem,
  useUpdateInventoryItem,
} from '@/features/inventory/hooks'
import {
  inventoryItemSchema,
  type InventoryItemFormValues,
} from '@/features/inventory/schemas'
import { numberInputRegister } from '@/lib/formNumbers'
import { ActiveToggle } from '@/features/settings/components/StatusControls'

interface InventoryItemFormModalProps {
  open: boolean
  item?: InventoryItem | null
  onClose: () => void
}

const defaults = {
  name: '',
  category: 'fuel',
  unit: 'л',
  currentStock: undefined as number | undefined,
  minStock: undefined as number | undefined,
  totalCapacity: undefined as number | undefined,
  isActive: true,
  cropCode: '',
} satisfies Partial<InventoryItemFormValues>

const selectClassName =
  'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive'

export function InventoryItemFormModal({ open, item, onClose }: InventoryItemFormModalProps) {
  const isEdit = Boolean(item)
  const createItem = useCreateInventoryItem()
  const updateItem = useUpdateInventoryItem()
  const { data: categories = [] } = useDictionary('inventory_category')
  const { data: crops = [] } = useDictionary('crop')
  const firstCategoryCode = categories[0]?.code

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: defaults,
  })
  const watchedCategory = useWatch({ control, name: 'category' })
  const showCropCode = isHarvestCategory(watchedCategory)

  const categoryItems = useMemo(() => {
    const rows = categories.map((row) => ({ value: row.code, label: row.name }))
    if (item?.category && !rows.some((row) => row.value === item.category)) {
      return [{ value: item.category, label: item.category }, ...rows]
    }
    return rows
  }, [categories, item?.category])

  const cropItems = useMemo(
    () =>
      buildDictionarySelectOptions(crops, {
        valueKey: 'code',
        orphanValue: item?.cropCode,
      }),
    [crops, item?.cropCode],
  )

  // Reset only when dialog opens / item id changes — NOT when `reset` identity changes
  // (that wiped cropCode after the user selected a culture).
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
            cropCode: item.cropCode ?? '',
          }
        : {
            ...defaults,
            category: firstCategoryCode ?? 'fuel',
            cropCode: '',
          },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item.id + open only
  }, [item?.id, open])

  const pending = isSubmitting || createItem.isPending || updateItem.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      disablePointerDismissal
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать позицию' : 'Добавить позицию ТМЦ'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            const category = String(values.category ?? '').trim()
            const cropCode = isHarvestCategory(category) ? asCropCode(values.cropCode) : ''
            if (isHarvestCategory(category) && (!cropCode || cropCode.toLowerCase() === 'none')) {
              setError('cropCode', { type: 'manual', message: 'Выберите культуру' })
              return
            }
            try {
              if (item) {
                await updateItem.mutateAsync({
                  id: item.id,
                  previousIsActive: item.isActive,
                  name: values.name,
                  category,
                  unit: values.unit,
                  minStock: values.minStock,
                  totalCapacity: values.totalCapacity,
                  isActive: values.isActive,
                  cropCode,
                })
              } else {
                await createItem.mutateAsync({ ...values, category, cropCode })
              }
              onClose()
            } catch {
              // Mutation onError already toasts — prevent uncaught promise noise.
            }
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
            <Label htmlFor="inv-category">Категория</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <select
                  id="inv-category"
                  className={selectClassName}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    const code = event.target.value
                    field.onChange(code)
                    if (isHarvestCategory(code)) {
                      setValue('unit', 'кг', { shouldDirty: true })
                    } else {
                      setValue('cropCode', '', { shouldValidate: true })
                    }
                  }}
                >
                  {categoryItems.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Категории задаются в Настройках → Категории ТМЦ. «Урожай (на складе)» —
              складской учёт продукции; KPI по культурам — в «Отгрузках урожая».
            </p>
            <ManageInSettingsLink tab="inventory-cats" tabHint="категории ТМЦ" />
          </div>

          {showCropCode ? (
            <div className="space-y-2">
              <Label htmlFor="inv-crop">Культура</Label>
              <Controller
                name="cropCode"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || null}
                    onValueChange={(value) => field.onChange(value ?? '')}
                    items={cropItems}
                    disabled={cropItems.length === 0}
                  >
                    <SelectTrigger
                      id="inv-crop"
                      className="w-full"
                      aria-invalid={Boolean(errors.cropCode) || undefined}
                    >
                      <SelectValue
                        placeholder={
                          cropItems.length === 0
                            ? 'Сначала добавьте культуру в Настройках'
                            : 'Выберите культуру'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {cropItems.map((crop) => (
                        <SelectItem key={crop.value} value={crop.value}>
                          {crop.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cropCode ? (
                <p className="text-xs text-destructive">{errors.cropCode.message}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Обязательно для урожая. Не создаёт запись в «Отгрузках урожая».
                </p>
              )}
              <ManageInSettingsLink tab="crops" tabHint="культуры" />
            </div>
          ) : null}

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
                {...register('currentStock', numberInputRegister)}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Остаток меняется приходами, расходами или «Корректировкой» — не через эту форму,
              чтобы не потерять историю операций.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="inv-min">Мин. запас</Label>
            <Input
              id="inv-min"
              type="number"
              min={0}
              step="any"
              {...register('minStock', numberInputRegister)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inv-capacity">Ёмкость</Label>
            <Input
              id="inv-capacity"
              type="number"
              min={0}
              step="any"
              {...register('totalCapacity', numberInputRegister)}
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
