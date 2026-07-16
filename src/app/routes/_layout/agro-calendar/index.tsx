import { lazy } from 'react'
import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { resolveCurrentUser, TOKEN_KEY } from '@/features/auth/utils'

const AgroCalendarPage = lazy(() =>
  import('@/features/agro-calendar/components/AgroCalendarPage').then((module) => ({
    default: module.AgroCalendarPage,
  })),
)

export const Route = createFileRoute('/_layout/agro-calendar/')({
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) throw redirect({ to: '/login' })

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
  component: AgroCalendarPage,
})
