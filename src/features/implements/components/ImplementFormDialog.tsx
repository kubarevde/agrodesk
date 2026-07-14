import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
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
import { implementFormSchema, type ImplementFormValues } from '../schemas'
import { CATEGORY_OPTIONS, CONDITION_OPTIONS, type ImplementResponse } from '../types'

type ImplementFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImplementResponse | null
  onSubmit: (values: ImplementFormValues) => Promise<void>
  isPending: boolean
}

const defaults: ImplementFormValues = {
  name: '',
  category: 'Посевная',
  serial_number: '',
  year_of_manufacture: undefined,
  condition: 'good',
  description: '',
  current_equipment_id: undefined,
  image_url: undefined,
}

export function ImplementFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isPending,
}: ImplementFormDialogProps) {
  const { data: equipment = [] } = useEquipment()
  const form = useForm<ImplementFormValues>({
    resolver: zodResolver(implementFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      item
        ? {
            name: item.name,
            category: item.category as ImplementFormValues['category'],
            serial_number: item.serial_number ?? '',
            year_of_manufacture: item.year_of_manufacture ?? undefined,
            condition: item.condition as ImplementFormValues['condition'],
            description: item.description ?? '',
            current_equipment_id: item.current_equipment_id ?? undefined,
            image_url: item.image_url ?? undefined,
          }
        : defaults,
    )
  }, [form, item, open])

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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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

          <div className="space-y-2">
            <Label>Состояние</Label>
            <Controller
              name="condition"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
