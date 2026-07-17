import { lazy } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

const SharingPage = lazy(() =>
  import('@/features/sharing/components/SharingPage').then((module) => ({
    default: module.SharingPage,
  })),
)

export const Route = createFileRoute('/_layout/sharing/')({
  beforeLoad: makeSectionBeforeLoad('sharing'),
  component: SharingPage,
})
