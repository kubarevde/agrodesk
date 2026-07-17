import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ReportsPage = lazy(() =>
  import('@/features/reports/components/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
)

export const Route = createFileRoute('/_layout/reports/')({
  beforeLoad: makeSectionBeforeLoad('reports'),
  component: ReportsPage,
})
