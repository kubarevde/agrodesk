import { lazy } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchCurrentUser, TOKEN_KEY } from '@/features/auth/utils'

const AgroCalendarPage = lazy(() =>
  import('@/features/agro-calendar/components/AgroCalendarPage').then((module) => ({
    default: module.AgroCalendarPage,
  })),
)

export const Route = createFileRoute('/_layout/agro-calendar/')({
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) throw redirect({ to: '/login' })

    const user = await context.queryClient.fetchQuery({
      queryKey: ['auth', 'me'],
      queryFn: fetchCurrentUser,
    })

    if (user.role === 'employee') {
      throw redirect({ to: '/my-shift' })
    }
  },
  component: AgroCalendarPage,
})
