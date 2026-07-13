import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/reports/')({
  component: ReportsPage,
})

function ReportsPage() {
  return <h1>Отчёты</h1>
}
