import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
