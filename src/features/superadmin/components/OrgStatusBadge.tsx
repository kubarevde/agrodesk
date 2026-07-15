import { Badge } from '@/components/ui/badge'
import type { Organization } from '@/features/superadmin/types'

export function OrgStatusBadge({ org }: { org: Organization }) {
  if (!org.isActive) {
    return (
      <Badge className="border-transparent bg-destructive/15 text-destructive">
        Заблокирована
      </Badge>
    )
  }
  if (org.plan === 'trial') {
    return (
      <Badge className="border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300">
        Trial
      </Badge>
    )
  }
  return (
    <Badge className="border-transparent bg-success/15 text-success">Активна</Badge>
  )
}
