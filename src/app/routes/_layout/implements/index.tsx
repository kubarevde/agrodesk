import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const ImplementsPage = lazy(() =>
  import('@/features/implements/components/ImplementsPage').then((module) => ({
    default: module.ImplementsPage,
  })),
)

export const Route = createFileRoute('/_layout/implements/')({
  component: ImplementsPage,
})
