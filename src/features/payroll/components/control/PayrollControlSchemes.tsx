import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney } from '@/features/payroll-payouts/format'
import { SCHEME_LABELS } from '../../labels'
import type { PayrollControlSchemeRow } from '../../controlTypes'
import type { PaymentScheme } from '../../types'

type Props = { rows: PayrollControlSchemeRow[] }

const ORDER: PaymentScheme[] = ['hourly', 'per_shift', 'monthly', 'piecework']

export function PayrollControlSchemes({ rows }: Props) {
  const byScheme = new Map(rows.map((r) => [r.scheme, r]))
  const cards = ORDER.map((scheme) => {
    const row = byScheme.get(scheme)
    return {
      scheme,
      label: row?.label ?? SCHEME_LABELS[scheme],
      employeesCount: row?.employeesCount ?? 0,
      accrued: row?.accrued ?? 0,
    }
  })

  return (
    <div className="min-w-0 space-y-3">
      <h3 className="text-sm font-semibold">Структура фонда оплаты труда</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.scheme}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-xl font-semibold tabular-nums">{formatMoney(card.accrued)}</p>
              <p className="text-xs text-muted-foreground">
                Сотрудников: {card.employeesCount}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
