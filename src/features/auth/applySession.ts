/** Apply auth session after login or holding switch (shared path). */

import type { QueryClient } from '@tanstack/react-query'
import { resetLocalDatabase } from '@/lib/db'
import { currentUserFromApi } from '@/lib/transformers'
import {
  AUTH_PERMISSIONS_QUERY_KEY,
  cacheCurrentUser,
  fetchUserPermissions,
  TOKEN_KEY,
} from '@/features/auth/utils'
import { setSelectedOrg } from '@/features/auth/selectedOrg'
import {
  clearHoldingContext,
  reconcileHoldingContextFromToken,
  setHoldingContext,
  type HoldingContext,
} from '@/features/holding/context'

export type AuthSessionPayload = {
  access_token: string
  employee: Record<string, unknown>
}

export async function applyAuthSession(
  queryClient: QueryClient,
  data: AuthSessionPayload,
  options?: {
    selectedOrg?: { id: string; name: string; slug: string } | null
    holdingContext?: HoldingContext | null
  },
): Promise<void> {
  try {
    await resetLocalDatabase()
  } catch {
    // best-effort
  }
  queryClient.clear()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  const user = currentUserFromApi(data.employee)
  cacheCurrentUser(user)
  queryClient.setQueryData(['auth', 'me'], user)
  queryClient.removeQueries({ queryKey: AUTH_PERMISSIONS_QUERY_KEY })
  await queryClient.fetchQuery({
    queryKey: AUTH_PERMISSIONS_QUERY_KEY,
    queryFn: fetchUserPermissions,
  })

  if (options?.selectedOrg) {
    setSelectedOrg(options.selectedOrg)
  }
  if (options?.holdingContext === null) {
    clearHoldingContext()
  } else if (options?.holdingContext) {
    setHoldingContext(options.holdingContext)
  } else {
    reconcileHoldingContextFromToken(data.access_token)
  }
}
