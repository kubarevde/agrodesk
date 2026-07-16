import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

type ManageInSettingsLinkProps = {
  tabHint?: string
  className?: string
}

/** Points users to Settings when a dictionary value is missing. */
export function ManageInSettingsLink({
  tabHint = 'справочники',
  className,
}: ManageInSettingsLinkProps) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Нет нужного значения?{' '}
      <Link
        to="/settings"
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        <Settings className="size-3" />
        Управлять в настройках ({tabHint})
      </Link>
    </p>
  )
}
