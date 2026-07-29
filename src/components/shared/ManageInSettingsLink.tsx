import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_SETTINGS_TAB,
  type SettingsTabId,
} from '@/features/settings/settingsSections'

type ManageInSettingsLinkProps = {
  /** Human-readable hint shown in the link text. */
  tabHint?: string
  /** Opens Settings on this subsection (`?tab=`). */
  tab?: SettingsTabId
  className?: string
}

/** Points users to Settings when a dictionary value is missing. */
export function ManageInSettingsLink({
  tabHint = 'справочники',
  tab = DEFAULT_SETTINGS_TAB,
  className,
}: ManageInSettingsLinkProps) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Нет нужного значения?{' '}
      <Link
        to="/settings"
        search={{ tab }}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        <Settings className="size-3" />
        Управлять в настройках ({tabHint})
      </Link>
    </p>
  )
}
