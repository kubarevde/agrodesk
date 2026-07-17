import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useWorkTypes } from '@/features/worktime/referenceHooks'
import {
  useCreateEmployeeRate,
  useUpdateEmployeeRate,
} from '@/features/employees/salaryHooks'
import {
  employeeRateFormSchema,
  type EmployeeRateFormValues,
} from '@/features/employees/schemas'
import type { EmployeeRate } from '@/features/employees/types'
import { formatRateCalculator, todayIsoDate } from '@/features/employees/salaryUtils'
import { EmployeeRateCalculator } from './EmployeeRateCalculator'
import { EmployeeRateFormFields } from './EmployeeRateFormFields'

interface EmployeeRateModalProps {
  open: boolean
  employeeId: string
  rate?: EmployeeRate | null
  onClose: () => void
}

const defaults: Partial<EmployeeRateFormValues> = {
  workTypeId: null,
  rate: undefined,
  overtimeThresholdHours: 8,
  overtimeMultiplier: 1,
  validFrom: todayIsoDate(),
  validTo: null,
  notes: null,
}

function toFormValues(rate: EmployeeRate): EmployeeRateFormValues {
  return {
    workTypeId: rate.workTypeId,
    rate: rate.rate,
    overtimeThresholdHours: rate.overtimeThresholdHours,
    overtimeMultiplier: rate.overtimeMultiplier,
    validFrom: rate.validFrom,
    validTo: rate.validTo,
    notes: rate.notes,
  }
}

export function EmployeeRateModal({
  open,
  employeeId,
  rate,
  onClose,
}: EmployeeRateModalProps) {
  const isEdit = Boolean(rate)
  const { data: workTypes = [], isLoading: workTypesLoading } = useWorkTypes()
  const createRate = useCreateEmployeeRate(employeeId)
  const updateRate = useUpdateEmployeeRate(employeeId)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeRateFormValues>({
    resolver: zodResolver(employeeRateFormSchema),
    defaultValues: defaults,
  })

  const watched = useWatch({ control })

  useEffect(() => {
    if (!open) {
      reset(defaults)
      return
    }
    reset(rate ? toFormValues(rate) : { ...defaults, validFrom: todayIsoDate() })
  }, [open, rate, reset])

  const workTypeOptions = [
    { value: '__base__', label: 'Базовая (без типа)' },
    ...workTypes.map((item) => ({ value: item.id, label: item.name })),
  ]

  const onSubmit = handleSubmit(async (values) => {
    if (isEdit && rate) {
      await updateRate.mutateAsync({ id: rate.id, values })
    } else {
      await createRate.mutateAsync(values)
    }
    onClose()
  })

  const pending = isSubmitting || createRate.isPending || updateRate.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать ставку' : 'Добавить ставку'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <EmployeeRateFormFields
            control={control}
            register={register}
            errors={errors}
            workTypeOptions={workTypeOptions}
            workTypesLoading={workTypesLoading}
          />

          <EmployeeRateCalculator
            text={formatRateCalculator(
              Number(watched.rate) || 0,
              Number(watched.overtimeThresholdHours) || 8,
              Number(watched.overtimeMultiplier) || 1,
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={pending} className="bg-primary hover:bg-primary-hover">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
