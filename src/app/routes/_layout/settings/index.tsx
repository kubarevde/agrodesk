import { lazy } from 'react'
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { resolveCurrentUser } from '@/features/auth/utils'

const SettingsPage = lazy(() =>
  import('@/features/settings/components/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)

export const Route = createFileRoute('/_layout/settings/')({
  beforeLoad: async ({ context }) => {
    try {
      const user = await resolveCurrentUser(context.queryClient)
      if (user.role === 'employee') {
        throw redirect({ to: '/my-shift' })
      }
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/login' })
    }
  },
  component: SettingsPage,
})
