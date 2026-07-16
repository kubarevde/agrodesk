import { Suspense } from 'react'
import { createFileRoute, isRedirect, Outlet, redirect } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { resolveCurrentUser, TOKEN_KEY } from '@/features/auth/utils'

export const Route = createFileRoute('/_layout')({
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      throw redirect({ to: '/login' })
    }

    try {
      await resolveCurrentUser(context.queryClient)
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/login' })
    }
  },
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
