import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { SingleImageUploader } from '@/components/shared/SingleImageUploader'
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
import { Textarea } from '@/components/ui/textarea'
import { useEquipment } from '@/features/worktime/referenceHooks'
import { useDictionary } from '@/features/dictionaries/hooks'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { implementFormSchema, type ImplementFormValues } from '../schemas'
import type { ImplementResponse } from '../types'
import { numberInputRegister } from '@/lib/formNumbers'

type ImplementFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImplementResponse | null
  onSubmit: (values: ImplementFormValues) => Promise<void>
  isPending: boolean
}

const defaults: ImplementFormValues = {
  name: '',
  category: '',
  serial_number: '',
  year_of_manufacture: undefined,
  description: '',
  current_equipment_id: undefined,
  image_url: undefined,
  current_usage_hours: undefined,
  service_interval_hours: undefined,
}

export function ImplementFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isPending,
}: ImplementFormDialogProps) {
  const { data: equipment = [] } = useEquipment()
  const { data: categories = [] } = useDictionary('implement_category')
  const form = useForm<ImplementFormValues>({
    resolver: zodResolver(implementFormSchema),
    defaultValues: defaults,
  })

  const categoryItems = useMemo(() => {
    const rows = categories.map((row) => ({ value: row.name, label: row.name }))
    if (item?.category && !rows.some((row) => row.value === item.category)) {
      return [{ value: item.category, label: item.category }, ...rows]
    }
    return rows
  }, [categories, item?.category])

  useEffect(() => {
    if (!open) return
    form.reset(
      item
        ? {
            name: item.name,
            category: item.category as ImplementFormValues['category'],
            serial_number: item.serial_number ?? '',
            year_of_manufacture: item.year_of_manufacture ?? undefined,
            description: item.description ?? '',
            current_equipment_id: item.current_equipment_id ?? undefined,
            image_url: item.image_url ?? undefined,
            current_usage_hours: item.current_usage_hours ?? undefined,
            service_interval_hours: item.service_interval_hours ?? undefined,
          }
        : {
            ...defaults,
            category: (categories[0]?.name ?? '') as ImplementFormValues['category'],
          },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Редактировать приспособление' : 'Добавить приспособление'}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="impl-name">Название</Label>
            <Input id="impl-name" {...form.register('name')} />
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Controller
              name="category"
              control={form.control}
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
              Категории — в Настройки → Категории приспособлений
            </p>
            <ManageInSettingsLink tabHint="категории приспособлений" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="impl-serial">Серийный номер</Label>
              <Input id="impl-serial" {...form.register('serial_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impl-year">Год выпуска</Label>
              <Input
                id="impl-year"
                type="number"
                {...form.register('year_of_manufacture', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="impl-hours">Наработка, ч</Label>
              <Input
                id="impl-hours"
                type="number"
                min={0}
                step="any"
                {...form.register('current_usage_hours', numberInputRegister)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impl-interval">Интервал ТО, ч</Label>
              <Input
                id="impl-interval"
                type="number"
                min={0}
                step="any"
                {...form.register('service_interval_hours', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="impl-desc">Описание</Label>
            <Textarea id="impl-desc" rows={3} {...form.register('description')} />
          </div>

          <div className="space-y-2">
            <Label>Прикрепить к технике</Label>
            <Controller
              name="current_equipment_id"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'none'}
                  onValueChange={(value) =>
                    field.onChange(value === 'none' ? undefined : value)
                  }
                  items={[
                    { value: 'none', label: 'Не прикреплять' },
                    ...equipment.map((eq) => ({ value: eq.id, label: eq.name })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Не прикреплять" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не прикреплять</SelectItem>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Фото</Label>
            <Controller
              name="image_url"
              control={form.control}
              render={({ field }) => (
                <SingleImageUploader
                  folder="implements"
                  value={field.value ?? null}
                  onChange={(url) => field.onChange(url ?? undefined)}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {item ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
