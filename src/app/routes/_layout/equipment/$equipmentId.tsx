import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

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
  beforeLoad: makeSectionBeforeLoad('equipment'),
  component: EquipmentDetailRoute,
})
