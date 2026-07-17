import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ForecastHowItWorks() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="size-4 text-primary" />
          Как считается прогноз
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-foreground">
        <p>
          Система смотрит расходы из модуля «Расходы» и доходы из «Отгрузок» за прошлые месяцы,
          учитывает сезонность и выбирает подходящий способ расчёта. Это ориентир для планирования
          закупок и ремонтов, а не точное обещание.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Берём суммы расходов и выручку отгрузок (кг × цена).</li>
          <li>Сравниваем прошлые месяцы и сезонность.</li>
          <li>Показываем ориентир на следующий период и предупреждаем о рисках.</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Категории затрат — из справочника «Категории затрат». Зарплата по сменам и списания склада
          не входят в сумму расходов, пока не оформлены как расход.
        </p>
      </CardContent>
    </Card>
  )
}
