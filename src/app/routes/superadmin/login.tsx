import { createFileRoute, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { SuperAdminLoginPage } from '@/features/superadmin/components/SuperAdminLoginPage'
import { SUPERADMIN_TOKEN_KEY } from '@/features/superadmin/types'

export const Route = createFileRoute('/superadmin/login')({
  beforeLoad: () => {
    if (localStorage.getItem(SUPERADMIN_TOKEN_KEY)) {
      throw redirect({ to: '/superadmin/dashboard' })
    }
  },
  component: SuperAdminLoginRoute,
})

function SuperAdminLoginRoute() {
  return (
    <>
      <SuperAdminLoginPage />
      <Toaster position="bottom-right" richColors />
    </>
  )
}
