import { createFileRoute, redirect } from '@tanstack/react-router'
import { SuperAdminLayout } from '@/features/superadmin/components/SuperAdminLayout'
import { SUPERADMIN_TOKEN_KEY } from '@/features/superadmin/types'

export const Route = createFileRoute('/superadmin/_authenticated')({
  beforeLoad: () => {
    if (!localStorage.getItem(SUPERADMIN_TOKEN_KEY)) {
      throw redirect({ to: '/superadmin/login' })
    }
  },
  component: SuperAdminLayout,
})
