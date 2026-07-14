import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const EquipmentDetailPage = lazy(() =>
  import('@/features/equipment/components/EquipmentDetailPage').then((module) => ({
    default: module.EquipmentDetailPage,
  })),
)

function EquipmentDetailRoute() {
  const { equipmentId } = Route.useParams()
  return <EquipmentDetailPage equipmentId={equipmentId} />
}

export const Route = createFileRoute('/_layout/equipment/$equipmentId')({
  component: EquipmentDetailRoute,
})
