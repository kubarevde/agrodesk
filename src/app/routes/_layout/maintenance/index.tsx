import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const MaintenancePage = lazy(() =>
  import('@/features/repair-journal/components/MaintenancePage').then((module) => ({
    default: module.MaintenancePage,
  })),
)

export const Route = createFileRoute('/_layout/maintenance/')({
  beforeLoad: makeSectionBeforeLoad('maintenance'),
  component: MaintenancePage,
})
