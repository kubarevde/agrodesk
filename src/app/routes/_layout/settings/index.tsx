import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchCurrentUser } from '@/features/auth/utils'

const SettingsPage = lazy(() =>
  import('@/features/settings/components/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const Route = createFileRoute('/_layout/settings/')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: ['auth', 'me'],
      queryFn: fetchCurrentUser,
    })

    if (user.role === 'employee') {
      throw redirect({ to: '/my-shift' })
    }
  },
  component: SettingsPage,
})
