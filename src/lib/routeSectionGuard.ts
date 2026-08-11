import type { QueryClient } from '@tanstack/react-query'
import { isRedirect, redirect } from '@tanstack/react-router'
import {
  fetchAllowedSections,
  guardActionAccess,
  guardSectionAccess,
  resolveCurrentUser,
} from '@/features/auth/utils'
import { NO_ACCESS_ROUTE, resolveHomeRoute } from '@/lib/permissions'
import { SECTION_ROUTE_MAP } from '@/lib/sectionRegistry'

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

/** Allow access if the user has any of the listed sections. */
export function makeAnySectionBeforeLoad(sections: string[]) {
  return async ({ context }: { context: RouteContext }) => {
    try {
      const user = await resolveCurrentUser(context.queryClient)
      if (user.role === 'admin') return
      const allowed = await fetchAllowedSections(context.queryClient)
      if (sections.some((section) => allowed.includes(section))) return
      const home = resolveHomeRoute(user.role, allowed)
      const homeSection = Object.entries(SECTION_ROUTE_MAP).find(([, route]) => route === home)?.[0]
      if (!home || sections.includes(homeSection ?? '')) {
        throw redirect({ to: NO_ACCESS_ROUTE })
      }
      throw redirect({ to: home })
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/login' })
    }
  }
}

export function makeActionBeforeLoad(action: string) {
  return async ({ context }: { context: RouteContext }) => {
    try {
      await guardActionAccess(context.queryClient, action)
    } catch (error) {
      if (isRedirect(error)) throw error
      throw redirect({ to: '/login' })
    }
  }
}
