import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { equipmentFormSchema, type EquipmentFormValues } from '../schemas'
import type { EquipmentDetail } from '../types'
import { EquipmentFormFields } from './EquipmentFormFields'

type EquipmentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: EquipmentDetail | null
  onSubmit: (values: EquipmentFormValues) => Promise<void>
  isPending: boolean
}

const defaults: EquipmentFormValues = {
  name: '',
  type: 'Трактор',
  year_of_manufacture: undefined,
  serial_number: '',
  meter_type: 'motohours',
  current_meter: 0,
  to_interval: undefined,
  latitude: undefined,
  longitude: undefined,
  image_url: undefined,
}

export function EquipmentFormDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isPending,
}: EquipmentFormDialogProps) {
  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      item
        ? {
            name: item.name,
            type: item.type ?? 'Трактор',
            year_of_manufacture: item.year_of_manufacture ?? undefined,
            serial_number: item.serial_number ?? '',
            meter_type: item.meter_type,
            current_meter: item.current_meter,
            to_interval: item.to_interval ?? undefined,
            latitude: item.latitude ?? undefined,
            longitude: item.longitude ?? undefined,
            image_url: item.image_url ?? undefined,
          }
        : defaults,
    )
  }, [form, item, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Редактировать технику' : 'Добавить технику'}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          <EquipmentFormFields
            control={form.control}
            register={form.register}
            setValue={form.setValue}
            watch={form.watch}
          />
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
