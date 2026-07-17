import type { QueryClient } from '@tanstack/react-query'
import { isRedirect, redirect } from '@tanstack/react-router'
import { guardSectionAccess } from '@/features/auth/utils'

type RouteContext = { queryClient: QueryClient }

/** Shared beforeLoad for section-protected routes. */
export async function sectionBeforeLoad(
  queryClient: QueryClient,
  section: string,
): Promise<void> {
  try {
    await guardSectionAccess(queryClient, section)
  } catch (error) {
    if (isRedirect(error)) throw error
    throw redirect({ to: '/login' })
  }
}

export function makeSectionBeforeLoad(section: string) {
  return async ({ context }: { context: RouteContext }) => {
    await sectionBeforeLoad(context.queryClient, section)
  }
}
