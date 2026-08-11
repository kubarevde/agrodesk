import { createFileRoute } from '@tanstack/react-router'
import { SharingPage } from '@/features/sharing/components/SharingPage'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

export const Route = createFileRoute('/_layout/sharing/')({
  beforeLoad: makeSectionBeforeLoad('sharing'),
  component: SharingPage,
})
