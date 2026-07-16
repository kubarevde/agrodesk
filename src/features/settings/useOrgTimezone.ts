import { useOrganizationSettings } from '@/features/settings/hooks'
import { DEFAULT_ORG_TIMEZONE } from '@/lib/timezone'

/** Organization IANA timezone from Settings (fallback Asia/Bangkok). */
export function useOrgTimezone(): string {
  const { data } = useOrganizationSettings()
  return data?.timezone?.trim() || DEFAULT_ORG_TIMEZONE
}
