import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useEmployees } from '@/features/employees/hooks'
import { taskFormSchema, type TaskFormValues } from '../schemas'
import { TASK_VISIBILITY_LABELS, type OrgTask } from '../types'

type Props = {
  open: boolean
  task?: OrgTask | null
  onClose: () => void
  onSubmit: (values: TaskFormValues) => void
  saving?: boolean
}

export function TaskFormModal({ open, task, onClose, onSubmit, saving }: Props) {
  const { data: employees = [] } = useEmployees({ enabled: open })
  const activeEmployees = employees.filter((e) => e.isActive !== false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      visibilityType: 'all_employees',
      assigneeId: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      task
        ? {
            title: task.title,
            description: task.description ?? '',
            visibilityType: task.visibilityType,
            assigneeId: task.assigneeId ?? '',
          }
        : {
            title: '',
            description: '',
            visibilityType: 'all_employees',
            assigneeId: '',
          },
    )
  }, [form, open, task])

  const visibility = useWatch({ control: form.control, name: 'visibilityType' })

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Редактировать задачу' : 'Создать задачу'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="task-title">Название</Label>
            <Input id="task-title" {...form.register('title')} maxLength={200} />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Описание (необязательно)</Label>
            <Textarea id="task-desc" rows={3} {...form.register('description')} maxLength={2000} />
          </div>
          <div className="space-y-2">
            <Label>Кому</Label>
            <Controller
              control={form.control}
              name="visibilityType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    if (v === 'all_employees') form.setValue('assigneeId', '')
                  }}
                  items={[
                    { value: 'all_employees', label: TASK_VISIBILITY_LABELS.all_employees },
                    {
                      value: 'specific_employee',
                      label: TASK_VISIBILITY_LABELS.specific_employee,
                    },
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_employees">
                      {TASK_VISIBILITY_LABELS.all_employees}
                    </SelectItem>
                    <SelectItem value="specific_employee">
                      {TASK_VISIBILITY_LABELS.specific_employee}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {visibility === 'specific_employee' ? (
            <div className="space-y-2">
              <Label>Сотрудник</Label>
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    items={activeEmployees.map((e) => ({
                      value: e.id,
                      label: e.employeeName,
                    }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Выберите сотрудника" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.employeeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.assigneeId ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.assigneeId.message}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary-hover">
              {task ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
