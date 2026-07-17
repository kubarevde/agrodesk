import { createFileRoute } from '@tanstack/react-router'
import { MyShiftPage } from '@/features/auth/MyShiftPage'
import { makeSectionBeforeLoad } from '@/lib/routeSectionGuard'

export const Route = createFileRoute('/_layout/my-shift/')({
  beforeLoad: makeSectionBeforeLoad('my-shift'),
  component: MyShiftPage,
})
