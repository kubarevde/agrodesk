import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'

export function OrderSuccess() {
  return (
    <div
      className="scroll-mt-20 space-y-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-5 sm:px-5"
      data-testid="order-success"
      role="status"
      id="order"
    >
      <div className="flex gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1.5">
          <p className="font-semibold text-foreground">Заявка отправлена</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Продавец увидит ваши контакты и свяжется по телефону. Оплата в АгроДеск не проходит —
            условия сделки вы обсуждаете напрямую.
          </p>
        </div>
      </div>
      <Link
        to="/market"
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        Вернуться в каталог
      </Link>
    </div>
  )
}
