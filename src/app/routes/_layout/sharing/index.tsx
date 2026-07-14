import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const SharingPage = lazy(() =>
  import('@/features/sharing/components/SharingPage').then((module) => ({
    default: module.SharingPage,
  })),
)

export const Route = createFileRoute('/_layout/sharing/')({
  component: SharingPage,
})
