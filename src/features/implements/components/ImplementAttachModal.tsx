import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEquipment } from '@/features/worktime/referenceHooks'
import { useAttachImplement } from '../hooks'
import { attachSchema, type AttachFormValues } from '../schemas'
import type { ImplementResponse } from '../types'

type ImplementAttachModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ImplementResponse | null
}

export function ImplementAttachModal({ open, onOpenChange, item }: ImplementAttachModalProps) {
  const { data: equipment = [] } = useEquipment()
  const attach = useAttachImplement()
  const form = useForm<AttachFormValues>({
    resolver: zodResolver(attachSchema),
    defaultValues: { equipment_id: '' },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset({ equipment_id: '' })
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Прикрепить: {item?.name}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            if (!item) return
            await attach.mutateAsync({ id: item.id, values })
            onOpenChange(false)
          })}
        >
          <div className="space-y-2">
            <Label>Техника</Label>
            <Controller
              name="equipment_id"
              control={form.control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите технику" />
                  </SelectTrigger>
                  <SelectContent>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={attach.isPending}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Прикрепить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
