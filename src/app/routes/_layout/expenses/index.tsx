import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/expenses/')({
  component: ExpensesPage,
})

function ExpensesPage() {
  return <h1>Затраты</h1>
}
