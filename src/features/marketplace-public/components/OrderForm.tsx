import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/lib/apiError'
import { createPublicOrder } from '../api'
import { OrderSuccess } from './OrderSuccess'

const orderSchema = z.object({
  buyer_name: z.string().trim().min(1, 'Укажите имя').max(200),
  buyer_phone: z.string().trim().min(5, 'Укажите телефон').max(40),
  buyer_comment: z.string().max(2000).optional(),
  quantity: z.number().positive('Количество должно быть больше 0'),
})

type OrderFormValues = z.infer<typeof orderSchema>

const fieldClass =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:text-sm'

export function OrderForm({
  listingId,
  maxQuantity,
  unit,
}: {
  listingId: string
  maxQuantity: number
  unit: string
}) {
  const [submitted, setSubmitted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { buyer_name: '', buyer_phone: '', buyer_comment: '', quantity: 1 },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting || submitted) return
    if (values.quantity > maxQuantity) {
      form.setError('quantity', { message: `Доступно не более ${maxQuantity} ${unit}` })
      return
    }
    setSubmitting(true)
    setApiError(null)
    try {
      await createPublicOrder({
        listing_id: listingId,
        buyer_name: values.buyer_name,
        buyer_phone: values.buyer_phone,
        buyer_comment: values.buyer_comment?.trim() || null,
        quantity: values.quantity,
      })
      setSubmitted(true)
    } catch (error) {
      setApiError(apiErrorMessage(error, 'Не удалось отправить заявку'))
    } finally {
      setSubmitting(false)
    }
  })

  if (submitted) return <OrderSuccess />

  if (!(maxQuantity > 0)) {
    return (
      <div
        id="order"
        className="scroll-mt-20 rounded-xl border border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground"
        data-testid="order-unavailable"
      >
        Сейчас нет в наличии — заявку отправить нельзя.
      </div>
    )
  }

  const { errors } = form.formState

  return (
    <form
      id="order"
      onSubmit={onSubmit}
      className="scroll-mt-20 space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-5"
      data-testid="order-form"
      noValidate
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">Оставить заявку</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Это не оплата. Продавец свяжется по телефону и договорится о деталях.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="buyer_name">
            Имя
          </label>
          <input
            id="buyer_name"
            autoComplete="name"
            className={fieldClass}
            placeholder="Как к вам обращаться"
            {...form.register('buyer_name')}
          />
          {errors.buyer_name ? (
            <p className="mt-1 text-xs text-destructive">{errors.buyer_name.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="buyer_phone">
            Телефон
          </label>
          <input
            id="buyer_phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={fieldClass}
            placeholder="+7 …"
            {...form.register('buyer_phone')}
          />
          {errors.buyer_phone ? (
            <p className="mt-1 text-xs text-destructive">{errors.buyer_phone.message}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="quantity">
          Количество ({unit})
        </label>
        <input
          id="quantity"
          type="number"
          step="any"
          min={0}
          className={fieldClass}
          {...form.register('quantity', { valueAsNumber: true })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Доступно: {maxQuantity.toLocaleString('ru-RU')} {unit}
        </p>
        {errors.quantity ? (
          <p className="mt-1 text-xs text-destructive">{errors.quantity.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="buyer_comment">
          Комментарий <span className="opacity-80">(необязательно)</span>
        </label>
        <textarea
          id="buyer_comment"
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
          placeholder="Удобное время звонка, адрес и т.п."
          {...form.register('buyer_comment')}
        />
      </div>

      {apiError ? (
        <p className="text-sm text-destructive" data-testid="order-error">
          {apiError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || form.formState.isSubmitting}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover"
      >
        {submitting ? 'Отправка…' : 'Оставить заявку'}
      </Button>
    </form>
  )
}
