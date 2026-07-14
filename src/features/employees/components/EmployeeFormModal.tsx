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
import {
  getEmployeeSchema,
  type EmployeeFormValues,
} from '@/features/employees/schemas'
import { ROLE_LABELS } from '@/features/employees/utils'

interface EmployeeFormModalProps {
  open: boolean
  employee?: Employee | null
  onClose: () => void
}

const defaultValues: EmployeeFormValues = {
  employeeCode: '',
  employeeName: '',
  position: '',
  hourlyRate: 0,
  role: 'employee',
  password: '',
  isActive: true,
}

function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    employeeCode: employee.employeeCode,
    employeeName: employee.employeeName,
    position: employee.position,
    hourlyRate: employee.hourlyRate,
    role: employee.role,
    password: '',
    isActive: employee.isActive,
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
    resolver: zodResolver(getEmployeeSchema(isEdit)),
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
      await updateEmployee.mutateAsync({
        id: employee.id,
        employeeName: values.employeeName,
        position: values.position,
        hourlyRate: values.hourlyRate,
        role: values.role,
        password: values.password || undefined,
        isActive: values.isActive,
      })
    } else {
      await createEmployee.mutateAsync(values)
    }
    handleClose()
  }

  const pending = isSubmitting || createEmployee.isPending || updateEmployee.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать сотрудника' : 'Добавить сотрудника'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="employeeCode">Код</Label>
            <Input
              id="employeeCode"
              placeholder="EMP006"
              readOnly={isEdit}
              className={isEdit ? 'bg-muted' : undefined}
              aria-invalid={Boolean(errors.employeeCode)}
              {...register('employeeCode')}
            />
            {errors.employeeCode ? (
              <p className="text-xs text-destructive">{errors.employeeCode.message}</p>
            ) : null}
          </div>

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
            <Label htmlFor="position">Должность</Label>
            <Input
              id="position"
              placeholder="тракторист"
              aria-invalid={Boolean(errors.position)}
              {...register('position')}
            />
            {errors.position ? (
              <p className="text-xs text-destructive">{errors.position.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hourlyRate">Ставка ₽/ч</Label>
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

          <div className="space-y-2">
            <Label htmlFor="password">
              Пароль
              {isEdit ? (
                <span className="text-muted-foreground"> (оставьте пустым, чтобы не менять)</span>
              ) : null}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>

          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-foreground">Активен</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={
                    field.value
                      ? 'relative h-6 w-11 rounded-full bg-success transition-colors'
                      : 'relative h-6 w-11 rounded-full bg-muted transition-colors'
                  }
                >
                  <span
                    className={
                      field.value
                        ? 'absolute top-0.5 left-5 size-5 rounded-full bg-white shadow transition-all'
                        : 'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-all'
                    }
                  />
                </button>
              </label>
            )}
          />

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-primary hover:bg-primary-hover text-primary-foreground sm:min-w-40"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isEdit ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
