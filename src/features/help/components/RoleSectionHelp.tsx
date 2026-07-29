import { SectionHelp, type SectionHelpItem } from '@/components/shared/SectionHelp'
import { useCurrentUser } from '@/features/auth/hooks'

type Props = {
  section?: string
  title?: string
  items: SectionHelpItem[]
  summary?: string
  className?: string
  /** Deep-link for /support/guide?section= */
  guideSection?: string
}

/** SectionHelp with current role filter + optional link to the system guide. */
export function RoleSectionHelp({ guideSection, ...rest }: Props) {
  const { data: user } = useCurrentUser()
  return <SectionHelp {...rest} role={user?.role} guideSection={guideSection} />
}
