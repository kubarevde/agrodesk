import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ForecastPage = lazy(() =>
  import('@/features/analytics/components/ForecastPage').then((module) => ({
    default: module.ForecastPage,
  })),
)

export const Route = createFileRoute('/_layout/analytics/forecast/')({
  beforeLoad: makeSectionBeforeLoad('analytics'),
  component: ForecastPage,
})
