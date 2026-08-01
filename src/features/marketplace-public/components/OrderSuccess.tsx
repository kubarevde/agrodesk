import { CheckCircle2 } from 'lucide-react'

export function OrderSuccess() {
  return (
    <div
      className="flex gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-4"
      data-testid="order-success"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="font-medium text-foreground">Заявка отправлена</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Продавец свяжется с вами по указанному телефону.
        </p>
      </div>
    </div>
  )
}
