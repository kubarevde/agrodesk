import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

export const Route = createFileRoute('/_layout/dashboard')({
  beforeLoad: makeSectionBeforeLoad('dashboard'),
  component: DashboardPage,
})
