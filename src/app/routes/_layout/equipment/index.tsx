import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const EquipmentPage = lazy(() =>
  import('@/features/equipment/components/EquipmentPage').then((module) => ({
    default: module.EquipmentPage,
  })),
)

export const Route = createFileRoute('/_layout/equipment/')({
  beforeLoad: makeSectionBeforeLoad('equipment'),
  component: EquipmentPage,
})
