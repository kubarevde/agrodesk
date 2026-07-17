import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const ImplementsPage = lazy(() =>
  import('@/features/implements/components/ImplementsPage').then((module) => ({
    default: module.ImplementsPage,
  })),
)

export const Route = createFileRoute('/_layout/implements/')({
  beforeLoad: makeSectionBeforeLoad('implements'),
  component: ImplementsPage,
})
