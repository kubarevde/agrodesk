import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

export const Route = createFileRoute('/_layout/dashboard')({
  component: DashboardPage,
})
