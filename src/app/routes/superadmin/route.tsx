import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { SUPERADMIN_TOKEN_KEY } from '@/features/superadmin/types'

export const Route = createFileRoute('/superadmin')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/superadmin' || location.pathname === '/superadmin/') {
      const token = localStorage.getItem(SUPERADMIN_TOKEN_KEY)
      throw redirect({ to: token ? '/superadmin/dashboard' : '/superadmin/login' })
    }
  },
  component: () => <Outlet />,
})
