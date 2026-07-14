import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useFields } from '@/features/fields/hooks'
import { useImplements } from '@/features/implements/hooks'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import {
  useEmployees,
  useEquipment,
  useWorkTypes,
} from '@/features/worktime/referenceHooks'
import { useCreateAgroPlan } from '../hooks'
import { agroPlanFormSchema, type AgroPlanFormValues } from '../schemas'

type AgroPlanFormDialogProps = {
  open: boolean
  onClose: () => void
}

export function AgroPlanFormDialog({ open, onClose }: AgroPlanFormDialogProps) {
  const createPlan = useCreateAgroPlan()
  const { data: fields = [] } = useFields()
  const { data: workTypes = [] } = useWorkTypes()
  const { data: equipment = [] } = useEquipment()
  const { data: employees = [] } = useEmployees()

  const form = useForm<AgroPlanFormValues>({
    resolver: zodResolver(agroPlanFormSchema),
    defaultValues: {
      plannedDate: formatApiDate(new Date()),
      plannedEndDate: '',
      fieldId: '',
      workTypeId: '',
      equipmentId: '',
      implementId: '',
      employeeId: '',
      notes: '',
    },
  })

  const equipmentId = useWatch({ control: form.control, name: 'equipmentId' })
  const { data: implementsList = [] } = useImplements(
    equipmentId ? { equipmentId } : undefined,
  )

  useEffect(() => {
    if (!open) return
    form.reset({
      plannedDate: formatApiDate(new Date()),
      plannedEndDate: '',
      fieldId: '',
      workTypeId: '',
      equipmentId: '',
      implementId: '',
      employeeId: '',
      notes: '',
    })
  }, [form, open])

  useEffect(() => {
    form.setValue('implementId', '')
  }, [equipmentId, form])

  const pending = form.formState.isSubmitting || createPlan.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Запланировать работу</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            await createPlan.mutateAsync({
              fieldId: values.fieldId,
              workTypeId: values.workTypeId,
              plannedDate: values.plannedDate,
              plannedEndDate: values.plannedEndDate || undefined,
              equipmentId: values.equipmentId || undefined,
              implementId: values.implementId || undefined,
              employeeId: values.employeeId || undefined,
              notes: values.notes || undefined,
            })
            onClose()
          })}
        >
          <DateField control={form.control} name="plannedDate" label="Дата начала" required />
          <DateField control={form.control} name="plannedEndDate" label="Дата окончания" />

          <SelectField
            label="Поле"
            value={form.watch('fieldId')}
            onChange={(value) => form.setValue('fieldId', value)}
            options={fields.map((item) => ({ value: item.id, label: item.name }))}
            error={form.formState.errors.fieldId?.message}
          />

          <SelectField
            label="Тип работы"
            value={form.watch('workTypeId')}
            onChange={(value) => form.setValue('workTypeId', value)}
            options={workTypes.map((item) => ({ value: item.id, label: item.name }))}
            error={form.formState.errors.workTypeId?.message}
          />

          <SelectField
            label="Техника"
            optional
            value={form.watch('equipmentId') || 'none'}
            onChange={(value) => form.setValue('equipmentId', value === 'none' ? '' : value)}
            options={equipment.map((item) => ({ value: item.id, label: item.name }))}
          />

          <SelectField
            label="Приспособление"
            optional
            value={form.watch('implementId') || 'none'}
            onChange={(value) => form.setValue('implementId', value === 'none' ? '' : value)}
            options={implementsList.map((item) => ({ value: item.id, label: item.name }))}
            disabled={!equipmentId}
          />

          <SelectField
            label="Сотрудник"
            optional
            value={form.watch('employeeId') || 'none'}
            onChange={(value) => form.setValue('employeeId', value === 'none' ? '' : value)}
            options={employees.map((item) => ({ value: item.id, label: item.employeeName }))}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea id="notes" rows={3} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DateField({
  control,
  name,
  label,
  required,
}: {
  control: ReturnType<typeof useForm<AgroPlanFormValues>>['control']
  name: 'plannedDate' | 'plannedEndDate'
  label: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {!required ? <span className="text-muted-foreground"> (необязательно)</span> : null}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm">
              <CalendarIcon className="size-4 text-muted-foreground" />
              {field.value
                ? format(parseApiDate(field.value), 'dd MMMM yyyy', { locale: ru })
                : 'Выберите дату'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={ru}
                selected={field.value ? parseApiDate(field.value) : undefined}
                onSelect={(date) => {
                  field.onChange(date ? formatApiDate(date) : '')
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
        )}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optional,
  error,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  optional?: boolean
  error?: string
  disabled?: boolean
}) {
  const selectOptions = optional
    ? [{ value: 'none', label: 'Не выбрано' }, ...options]
    : options

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {optional ? <span className="text-muted-foreground"> (необязательно)</span> : null}
      </Label>
      <LabeledSelect
        value={optional ? value || 'none' : value}
        onValueChange={(next) => {
          if (optional && (!next || next === 'none')) onChange('')
          else onChange(next ?? '')
        }}
        options={selectOptions}
        placeholder="Выберите"
        disabled={disabled}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
