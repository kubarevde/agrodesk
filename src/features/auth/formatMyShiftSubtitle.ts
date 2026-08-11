import type { CurrentUser } from '@/lib/transformers'
import { getSelectedOrg } from '@/features/auth/selectedOrg'

/** Human-readable subtitle for «Моя смена» (name + org, not login code). */
export function formatMyShiftSubtitle(
  user: Pick<CurrentUser, 'fullName'> | null | undefined,
  orgName?: string | null,
): string {
  const name = user?.fullName?.trim() || ''
  const org = (orgName ?? getSelectedOrg()?.name ?? '').trim()
  if (name && org) return `${name} · ${org}`
  if (name) return name
  if (org) return org
  return ''
}
