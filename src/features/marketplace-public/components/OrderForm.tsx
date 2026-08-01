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
    defaultValues: {
      buyer_name: '',
      buyer_phone: '',
      buyer_comment: '',
      quantity: 1,
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (submitting || submitted) return
    if (values.quantity > maxQuantity) {
      form.setError('quantity', {
        message: `Доступно не более ${maxQuantity} ${unit}`,
      })
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

  return (
    <form onSubmit={onSubmit} className="space-y-3" data-testid="order-form" noValidate>
      <p className="text-sm font-medium text-foreground">Оставить заявку</p>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="buyer_name">
          Имя
        </label>
        <input
          id="buyer_name"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
          {...form.register('buyer_name')}
        />
        {form.formState.errors.buyer_name ? (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.buyer_name.message}</p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="buyer_phone">
          Телефон
        </label>
        <input
          id="buyer_phone"
          type="tel"
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
          {...form.register('buyer_phone')}
        />
        {form.formState.errors.buyer_phone ? (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.buyer_phone.message}</p>
        ) : null}
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
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
          {...form.register('quantity', { valueAsNumber: true })}
        />
        {form.formState.errors.quantity ? (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.quantity.message}</p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="buyer_comment">
          Комментарий
        </label>
        <textarea
          id="buyer_comment"
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base sm:text-sm"
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
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary-hover sm:h-10"
      >
        {submitting ? 'Отправка…' : 'Оставить заявку'}
      </Button>
    </form>
  )
}
