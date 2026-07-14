import { createFileRoute } from '@tanstack/react-router'
import { MyShiftPage } from '@/features/auth/MyShiftPage'

export const Route = createFileRoute('/_layout/my-shift/')({
  component: MyShiftPage,
})
