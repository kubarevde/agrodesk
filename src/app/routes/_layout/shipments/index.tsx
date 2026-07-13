import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/shipments/')({
  component: ShipmentsPage,
})

function ShipmentsPage() {
  return <h1>Отгрузки</h1>
}
