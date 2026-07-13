import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/employees/')({
  component: EmployeesPage,
})

function EmployeesPage() {
  return <h1>Сотрудники</h1>
}
