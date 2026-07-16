import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { LoginPage } from '@/features/auth/LoginPage'
import {
  getHomeRoute,
  resolveCurrentUser,
  TOKEN_KEY,
} from '@/features/auth/utils'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    try {
      const user = await resolveCurrentUser(context.queryClient)
      throw redirect({ to: getHomeRoute(user.role) })
    } catch (error) {
      if (isRedirect(error)) throw error
      // Invalid session already cleared inside resolveCurrentUser; stay on login
    }
  },
  component: LoginRoute,
})

function LoginRoute() {
  return (
    <>
      <LoginPage />
      <Toaster position="bottom-right" richColors />
    </>
  )
}
