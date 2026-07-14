import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const EquipmentPage = lazy(() =>
  import('@/features/equipment/components/EquipmentPage').then((module) => ({
    default: module.EquipmentPage,
  })),
)

export const Route = createFileRoute('/_layout/equipment/')({
  component: EquipmentPage,
})
