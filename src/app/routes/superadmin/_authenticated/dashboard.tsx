import { createFileRoute } from '@tanstack/react-router'
import { SuperAdminDashboardPage } from '@/features/superadmin/components/SuperAdminDashboardPage'

export const Route = createFileRoute('/superadmin/_authenticated/dashboard')({
  component: SuperAdminDashboardPage,
})
