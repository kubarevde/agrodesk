import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarIcon, Loader2, Plus } from 'lucide-react'
import { useEffect } from 'react'
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
import type { ManualIncome } from '@/types'
import { ManageInSettingsLink } from '@/components/shared/ManageInSettingsLink'
import { CropVarietySelect } from '@/components/shared/CropVarietySelect'
import { buildDictionarySelectOptions } from '@/features/dictionaries/labels'
import { useDictionary } from '@/features/dictionaries/hooks'
import { formatApiDate, parseApiDate } from '@/features/worktime/utils'
import { useCreateManualIncome, useUpdateManualIncome } from '../incomeHooks'
import { incomeFormSchema, type IncomeFormValues } from '../incomeSchemas'
import { PAYMENT_LABELS, PAYMENT_METHODS } from '../utils'
import { numberInputRegister } from '@/lib/formNumbers'

interface IncomeFormModalProps {
  open: boolean
  income?: ManualIncome | null
  onClose: () => void
}

function getDefaultValues(defaultCategory = ''): Partial<IncomeFormValues> {
  return {
    date: formatApiDate(new Date()),
    category: defaultCategory,
    amount: undefined,
    description: '',
    counterparty: '',
    paymentMethod: 'transfer',
    cropCode: '',
    varietyId: '',
  }
}

function toFormValues(income: ManualIncome): IncomeFormValues {
  return {
    date: income.date,
    category: income.category,
    amount: income.amount,
    description: income.description,
    counterparty: income.counterparty ?? '',
    paymentMethod: income.paymentMethod ?? 'transfer',
    cropCode: income.cropCode ?? '',
    varietyId: income.varietyId ?? '',
  }
}

export function IncomeFormModal({ open, income, onClose }: IncomeFormModalProps) {
  const isEdit = Boolean(income)
  const createIncome = useCreateManualIncome()
  const updateIncome = useUpdateManualIncome()
  const { data: categories = [], isLoading: categoriesLoading } =
    useDictionary('income_category')
  const { data: crops = [], isLoading: cropsLoading } = useDictionary('crop')
  const firstCategory = categories[0]?.code ?? ''
  const categoryItems = buildDictionarySelectOptions(categories, {
    valueKey: 'code',
    orphanValue: income?.category,
  })
  const cropItems = buildDictionarySelectOptions(crops, {
    valueKey: 'code',
    orphanValue: income?.cropCode ?? undefined,
  })
  const dictionaryEmpty =
    !categoriesLoading && categories.length === 0 && !income?.category
  const paymentItems = PAYMENT_METHODS.map((method) => ({
    value: method,
    label: PAYMENT_LABELS[method],
  }))

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: getDefaultValues(firstCategory),
  })

  const cropCodeWatch = useWatch({ control, name: 'cropCode' })

  useEffect(() => {
    if (!open) {
      reset(getDefaultValues(firstCategory))
      return
    }
    reset(income ? toFormValues(income) : getDefaultValues(firstCategory))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income?.id, open, reset, firstCategory])

  const handleClose = () => {
    reset(getDefaultValues(firstCategory))
    onClose()
  }

  const onSubmit = async (values: IncomeFormValues) => {
    if (income) {
      await updateIncome.mutateAsync({ id: income.id, ...values })
    } else {
      await createIncome.mutateAsync(values)
    }
    handleClose()
  }

  const pending = isSubmitting || createIncome.isPending || updateIncome.isPending

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать доход' : 'Добавить доход'}</DialogTitle>
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
              <ManageInSettingsLink tab="income-cats" tabHint="категории доходов" />
            )}
          </div>

          <div className="space-y-2">
            <Label>Культура (необязательно)</Label>
            <Controller
              name="cropCode"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(code) => {
                    const next = !code || code === '__none__' ? '' : code
                    field.onChange(next)
                    setValue('varietyId', '', { shouldDirty: true })
                  }}
                  items={[
                    { value: '__none__', label: 'Не указано' },
                    ...cropItems,
                  ]}
                  disabled={cropsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Не указано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не указано</SelectItem>
                    {cropItems.map((crop) => (
                      <SelectItem key={crop.value} value={crop.value}>
                        {crop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              name="varietyId"
              control={control}
              render={({ field }) => (
                <CropVarietySelect
                  cropCode={cropCodeWatch}
                  value={field.value}
                  onChange={(id) => field.onChange(id ?? '')}
                  showWhenEmpty
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-amount">Сумма (₽)</Label>
            <Input
              id="income-amount"
              type="number"
              min={0}
              step="any"
              aria-invalid={Boolean(errors.amount)}
              {...register('amount', numberInputRegister)}
            />
            {errors.amount ? (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-description">Описание</Label>
            <Input
              id="income-description"
              placeholder="Услуги, шеринг, субсидия…"
              aria-invalid={Boolean(errors.description)}
              {...register('description')}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-counterparty">Контрагент</Label>
            <Input
              id="income-counterparty"
              placeholder="Необязательно"
              {...register('counterparty')}
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
                  items={paymentItems}
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
              {isEdit ? 'Сохранить' : 'Добавить доход'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
