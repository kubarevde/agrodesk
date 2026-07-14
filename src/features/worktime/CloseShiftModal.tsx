import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { useCurrentUser } from '@/features/auth/hooks'
import { closeShiftSchema, type CloseShiftFormValues } from './closeShiftSchema'
import { useCloseShift } from './hooks'
import { useLiveShiftDuration } from './useLiveShiftDuration'
import { formatShiftTime } from './utils'

interface CloseShiftModalProps {
  shiftId: string
  employeeId?: string
  startTime: string
  shiftDate?: string
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const defaultValues: CloseShiftFormValues = {
  description: '',
  comment: '',
}

export function CloseShiftModal({
  shiftId,
  employeeId,
  startTime,
  shiftDate,
  open,
  onClose,
  onSuccess,
}: CloseShiftModalProps) {
  const { data: user } = useCurrentUser()
  const canClose =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    (Boolean(employeeId) && employeeId === user?.id)

  const closeShift = useCloseShift()
  const [commentHidden, setCommentHidden] = useState(false)
  const durationLabel = useLiveShiftDuration(startTime, shiftDate, open)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CloseShiftFormValues>({
    resolver: zodResolver(closeShiftSchema),
    defaultValues,
  })

  const descriptionValue = watch('description') ?? ''

  useEffect(() => {
    if (!open) {
      reset(defaultValues)
      setCommentHidden(false)
    }
  }, [open, reset])

  const handleClose = () => {
    reset(defaultValues)
    setCommentHidden(false)
    onClose()
  }

  const onSubmit = (values: CloseShiftFormValues) => {
    if (!canClose) return
    closeShift.mutate(
      {
        id: shiftId,
        description: values.description,
        comment: values.comment ?? '',
      },
      {
        onSuccess: () => {
          onSuccess?.()
          handleClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Завершить смену</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          <span>Начало: {formatShiftTime(startTime)}</span>
          <span>Длительность: {durationLabel}</span>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="description">Что сделано за смену?</Label>
            <Textarea
              id="description"
              placeholder="Опишите выполненные работы..."
              aria-invalid={Boolean(errors.description)}
              maxLength={500}
              {...register('description')}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">{descriptionValue.length}/500</span>
            </div>
          </div>

          {commentHidden ? null : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="comment">Комментарий</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValue('comment', '')
                    setCommentHidden(true)
                  }}
                >
                  Без комментария
                </Button>
              </div>
              <Textarea
                id="comment"
                placeholder="Дополнительный комментарий..."
                maxLength={300}
                {...register('comment')}
              />
            </div>
          )}

          {canClose ? (
            <DialogFooter className="sm:justify-stretch">
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || closeShift.isPending}
                className="w-full"
              >
                {isSubmitting || closeShift.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Square className="size-4" />
                )}
                Завершить смену
              </Button>
            </DialogFooter>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  )
}
