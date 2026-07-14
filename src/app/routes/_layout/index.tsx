import { createFileRoute, redirect } from '@tanstack/react-router'
import { fetchCurrentUser, getHomeRoute } from '@/features/auth/utils'

export const Route = createFileRoute('/_layout/')({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      queryKey: ['auth', 'me'],
      queryFn: fetchCurrentUser,
    })
    throw redirect({ to: getHomeRoute(user.role) })
  },
})
