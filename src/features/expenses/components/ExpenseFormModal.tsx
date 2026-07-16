import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Expense } from '@/types'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { buildDictionarySelectOptions } from '@/features/dictionaries/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useCreateExpense, useUpdateExpense } from '@/features/expenses/hooks'
import { expenseFormSchema, type ExpenseFormValues } from '@/features/expenses/schemas'
import { PAYMENT_LABELS, PAYMENT_METHODS } from '@/features/expenses/utils'
import { useEquipment } from '@/features/worktime/referenceHooks'

interface ExpenseFormModalProps {
  open: boolean
  expense?: Expense | null
  defaultEquipmentId?: string
  onClose: () => void
}

function getDefaultValues(equipmentId?: string, defaultCategory = ''): ExpenseFormValues {
  return {
    date: formatApiDate(new Date()),
    category: defaultCategory,
    amount: 0,
    description: '',
    supplier: '',
    paymentMethod: 'cash',
    equipmentId: equipmentId ?? '',
  }
}

function toFormValues(expense: Expense): ExpenseFormValues {
  return {
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    supplier: expense.supplier ?? '',
    paymentMethod: expense.paymentMethod ?? 'cash',
    equipmentId: expense.equipmentId ?? '',
  }
}

export function ExpenseFormModal({
  open,
  expense,
  defaultEquipmentId,
  onClose,
}: ExpenseFormModalProps) {
  const isEdit = Boolean(expense)
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const { data: equipment = [] } = useEquipment()
  const { data: categories = [], isLoading: categoriesLoading } =
    useDictionary('expense_category')
  const firstCategory = categories[0]?.code ?? ''
  const categoryItems = buildDictionarySelectOptions(categories, {
    valueKey: 'code',
    orphanValue: expense?.category,
  })
  const dictionaryEmpty =
    !categoriesLoading && categories.length === 0 && !expense?.category

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: getDefaultValues(defaultEquipmentId, firstCategory),
  })

  useEffect(() => {
    if (!open) {
      reset(getDefaultValues(defaultEquipmentId, firstCategory))
      return
    }
    reset(
      expense
        ? toFormValues(expense)
        : getDefaultValues(defaultEquipmentId, firstCategory),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEquipmentId, expense?.id, open, reset, firstCategory])

  const handleClose = () => {
    reset(getDefaultValues(defaultEquipmentId, firstCategory))
    onClose()
  }

  const onSubmit = async (values: ExpenseFormValues) => {
    const payload = {
      ...values,
      equipmentId: values.equipmentId || undefined,
    }
    if (expense) {
      await updateExpense.mutateAsync({ id: expense.id, ...payload })
    } else {
      await createExpense.mutateAsync(payload)
    }
    handleClose()
  }

  const pending = isSubmitting || createExpense.isPending || updateExpense.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать затрату' : 'Добавить затрату'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Дата</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger
                    className="inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border border-input px-3 text-sm"
                    aria-invalid={Boolean(errors.date)}
                  >
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
                      onSelect={(date) => field.onChange(date ? formatApiDate(date) : '')}
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date ? <p className="text-xs text-destructive">{errors.date.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={categoryItems}
                  disabled={dictionaryEmpty}
                >
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.category)}>
                    <SelectValue
                      placeholder={
                        dictionaryEmpty
                          ? 'Сначала добавьте категорию в Настройках'
                          : 'Выберите категорию'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryItems.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category ? (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            ) : (
              <ManageInSettingsLink tabHint="категории затрат" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (₽)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.amount)}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount ? (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              placeholder="Заправка дизеля"
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Поставщик</Label>
            <Input id="supplier" placeholder="ООО «НефтеГаз»" {...register('supplier')} />
          </div>

          <div className="space-y-2">
            <Label>
              Техника <span className="text-muted-foreground">(необязательно)</span>
            </Label>
            <Controller
              name="equipmentId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  items={[
                    { value: 'none', label: 'Не выбрано' },
                    ...equipment.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {equipment.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>Способ оплаты</Label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={PAYMENT_METHODS.map((method) => ({
                    value: method,
                    label: PAYMENT_LABELS[method],
                  }))}
                >
                  <SelectTrigger className="w-full" aria-invalid={Boolean(errors.paymentMethod)}>
                    <SelectValue placeholder="Выберите способ оплаты" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_LABELS[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentMethod ? (
              <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>
            ) : null}
          </div>

          <DialogFooter className="sm:justify-stretch">
            <Button
              type="submit"
              disabled={pending || dictionaryEmpty}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {isEdit ? 'Сохранить' : 'Добавить затрату'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
