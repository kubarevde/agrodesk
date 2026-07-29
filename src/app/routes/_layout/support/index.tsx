import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const SupportListPage = lazy(() =>
  import('@/features/support/components/SupportListPage').then((m) => ({
    default: m.SupportListPage,
  })),
)

export const Route = createFileRoute('/_layout/support/')({
  component: SupportListPage,
})
