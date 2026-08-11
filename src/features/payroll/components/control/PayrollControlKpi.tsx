import { Banknote, CircleDollarSign, Receipt, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/features/payroll-payouts/format'
import type { PayrollControlKpi } from '../../controlTypes'

type Props = {
  kpi: PayrollControlKpi
  periodFrom: string
  periodTo: string
  onOpenAccruals: () => void
  onOpenExpenses: (fromIso: string, toIso: string) => void
  onOpenPayouts: () => void
}

const CARDS = [
  {
    key: 'accrued' as const,
    title: 'Начислено',
    hint:
      'Подтверждённая сумма начислений за выбранный период, включая премии, штрафы, удержания и другие корректировки',
    icon: CircleDollarSign,
    action: 'accruals' as const,
  },
  {
    key: 'expensesPosted' as const,
    title: 'Проведено в расходы',
    hint: 'Начисления, автоматически проведённые в расходы при подтверждении зарплаты',
    icon: Receipt,
    action: 'expenses' as const,
  },
  {
    key: 'paid' as const,
    title: 'Выдано',
    hint: 'Фактически выданные сотрудникам деньги: авансы и выплаты зарплаты',
    icon: Banknote,
    action: 'payouts' as const,
  },
  {
    key: 'remainder' as const,
    title: 'Остаток к выдаче',
    hint: 'Сумма подтверждённой зарплаты, которая ещё не выдана сотрудникам',
    icon: Wallet,
    action: 'payouts' as const,
  },
]

export function PayrollControlKpi({
  kpi,
  periodFrom,
  periodTo,
  onOpenAccruals,
  onOpenExpenses,
  onOpenPayouts,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, title, hint, icon: Icon, action }) => (
        <button
          key={key}
          type="button"
          title={hint}
          className="text-left"
          onClick={() => {
            if (action === 'accruals') onOpenAccruals()
            else if (action === 'expenses') onOpenExpenses(periodFrom, periodTo)
            else onOpenPayouts()
          }}
        >
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {formatMoney(kpi[key])}
              </p>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  )
}
