import { createFileRoute, isRedirect, redirect } from '@tanstack/react-router'
import { LandingPage } from '@/features/landing/LandingPage'
import { resolveUserHomeRoute, TOKEN_KEY } from '@/features/auth/utils'

/**
 * Public landing at `/`.
 * If the user already has a valid session (e.g. PWA reopen), send them home by grants.
 */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    try {
      const home = await resolveUserHomeRoute(context.queryClient)
      throw redirect({ to: home })
    } catch (error) {
      if (isRedirect(error)) throw error
      // Invalid / offline without usable cache — stay on public landing
    }
  },
  component: LandingPage,
})
