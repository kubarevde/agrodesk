import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const ReportsPage = lazy(() =>
  import('@/features/reports/components/ReportsPage').then((module) => ({
    default: module.ReportsPage,
  })),
)

export const Route = createFileRoute('/_layout/reports/')({
  component: ReportsPage,
})
