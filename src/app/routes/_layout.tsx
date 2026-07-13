import { Suspense } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSkeleton } from '@/components/shared/PageSkeleton'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <>
      <Suspense fallback={<PageSkeleton />}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </Suspense>
      <Toaster position="bottom-right" richColors />
    </>
  )
}
