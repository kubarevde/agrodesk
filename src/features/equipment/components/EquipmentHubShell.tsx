import { useNavigate } from '@tanstack/react-router'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type EquipmentHubTab = 'equipment' | 'implements'

const HUB_OPTIONS = [
  { value: 'equipment' as const, label: 'Техника' },
  { value: 'implements' as const, label: 'Приспособления' },
]

type EquipmentHubShellProps = {
  active: EquipmentHubTab
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Shared chrome for /equipment and /implements — segmented control changes the real route. */
export function EquipmentHubShell({
  active,
  title,
  actions,
  children,
  className,
}: EquipmentHubShellProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('space-y-5 overflow-x-hidden', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="min-w-0 text-2xl font-semibold break-words text-foreground">{title}</h1>
        {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
      </div>

      <SegmentedControl
        value={active}
        onChange={(next) => {
          if (next === 'implements') {
            void navigate({ to: '/implements' })
          } else {
            void navigate({ to: '/equipment' })
          }
        }}
        options={HUB_OPTIONS}
        size="lg"
        ariaLabel="Раздел техники"
        className="max-w-md"
      />

      {children}
    </div>
  )
}
