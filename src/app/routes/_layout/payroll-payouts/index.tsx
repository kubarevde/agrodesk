import { createFileRoute, redirect } from '@tanstack/react-router'

/** Legacy top-level payouts URL → Employees → Оплата труда → Выдача ЗП */
export const Route = createFileRoute('/_layout/payroll-payouts/')({
  beforeLoad: () => {
    throw redirect({
      to: '/employees',
      search: { tab: 'salary', payroll: 'payouts', runId: undefined },
    })
  },
  component: function PayrollPayoutsRedirect() {
    return null
  },
})
