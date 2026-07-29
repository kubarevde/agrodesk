import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const SupportCreatePage = lazy(() =>
  import('@/features/support/components/SupportCreatePage').then((m) => ({
    default: m.SupportCreatePage,
  })),
)

export const Route = createFileRoute('/_layout/support/new')({
  component: SupportCreatePage,
})
