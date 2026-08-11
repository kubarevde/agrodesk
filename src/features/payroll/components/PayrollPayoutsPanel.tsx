import { getRouteApi } from '@tanstack/react-router'
import { PayrollPayoutsPage } from '@/features/payroll-payouts/components/PayrollPayoutsPage'

const employeesRoute = getRouteApi('/_layout/employees/')

type Props = {
  canPay: boolean
  canView: boolean
}

export function PayrollPayoutsPanel({ canPay, canView }: Props) {
  const { runId } = employeesRoute.useSearch()

  if (!canView) {
    return (
      <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
        Нет права просмотра ведомости. Обратитесь к администратору за доступом к выдаче или просмотру начислений.
      </p>
    )
  }
  return (
    <PayrollPayoutsPage embedded canPay={canPay} initialRunId={runId ?? null} />
  )
}
