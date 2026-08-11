import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { taskCancelSchema, type TaskCancelValues } from '../schemas'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: (reason: string) => void
  saving?: boolean
}

export function TaskCancelModal({ open, title, onClose, onSubmit, saving }: Props) {
  const form = useForm<TaskCancelValues>({
    resolver: zodResolver(taskCancelSchema),
    defaultValues: { cancellationReason: '' },
  })

  useEffect(() => {
    if (open) form.reset({ cancellationReason: '' })
  }, [form, open])

  const reason = form.watch('cancellationReason')

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отменить задачу</DialogTitle>
        </DialogHeader>
        <p className="break-words text-sm text-muted-foreground">{title}</p>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => onSubmit(values.cancellationReason))}
        >
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Причина отмены</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              {...form.register('cancellationReason')}
              maxLength={2000}
            />
            {form.formState.errors.cancellationReason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.cancellationReason.message}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Назад
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={saving || reason.trim().length < 5}
            >
              Отменить задачу
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
