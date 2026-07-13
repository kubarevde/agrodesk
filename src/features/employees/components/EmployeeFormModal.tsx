import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
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
import type { Employee } from '@/types'
import { useCreateEmployee, useUpdateEmployee } from '@/features/employees/hooks'
import { employeeSchema, type EmployeeFormValues } from '@/features/employees/schemas'
import { POSITION_OPTIONS, ROLE_LABELS } from '@/features/employees/utils'

interface EmployeeFormModalProps {
  open: boolean
  employee?: Employee | null
  onClose: () => void
}

const defaultValues: EmployeeFormValues = {
  employeeName: '',
  position: '',
  hourlyRate: 0,
  telegramId: '',
  role: 'employee',
}

function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    employeeName: employee.employeeName,
    position: employee.position,
    hourlyRate: employee.hourlyRate,
    telegramId: employee.telegramId,
    role: employee.role,
  }
}

export function EmployeeFormModal({ open, employee, onClose }: EmployeeFormModalProps) {
  const isEdit = Boolean(employee)
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) {
      reset(defaultValues)
      return
    }

    reset(employee ? toFormValues(employee) : defaultValues)
  }, [employee, open, reset])

  const handleClose = () => {
    reset(defaultValues)
    onClose()
  }

  const onSubmit = async (values: EmployeeFormValues) => {
    if (employee) {
      await updateEmployee.mutateAsync({ id: employee.id, ...values })
    } else {
      await createEmployee.mutateAsync(values)
    }
    handleClose()
  }

  const pending = isSubmitting || createEmployee.isPending || updateEmployee.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="employeeName">ФИО</Label>
            <Input
              id="employeeName"
              placeholder="Иванов Иван Иванович"
              aria-invalid={Boolean(errors.employeeName)}
              {...register('employeeName')}
            />
            {errors.employeeName ? (
              <p className="text-xs text-destructive">{errors.employeeName.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Должность</Label>
            <Controller
              name="position"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.position)}>
                    <SelectValue placeholder="Выберите должность" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.position ? (
              <p className="text-xs text-destructive">{errors.position.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Ставка, ₽/ч</Label>
            <Input
              id="hourlyRate"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.hourlyRate)}
              {...register('hourlyRate', { valueAsNumber: true })}
            />
            {errors.hourlyRate ? (
              <p className="text-xs text-destructive">{errors.hourlyRate.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegramId">
              Telegram ID <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Input
              id="telegramId"
              type="number"
              placeholder="123456789"
              {...register('telegramId')}
            />
          </div>

          <div className="space-y-2">
            <Label>Роль</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['admin', 'manager', 'employee'] as const).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isEdit ? 'Сохранить' : 'Добавить сотрудника'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
