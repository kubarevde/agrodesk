import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { LoginPage } from '@/features/auth/LoginPage'
import { resolveUserHomeRoute, TOKEN_KEY } from '@/features/auth/utils'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    try {
      const home = await resolveUserHomeRoute(context.queryClient)
      throw redirect({ to: home })
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
