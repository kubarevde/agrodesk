import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

export type CardActionItem = {
  id: string
  label: string
  icon?: LucideIcon
  onSelect: () => void
  variant?: 'default' | 'destructive'
}

type CardActionsMenuProps = {
  actions: CardActionItem[]
  /** Sheet title on mobile */
  title?: string
  ariaLabel?: string
  /** Stop parent card click handlers */
  stopPropagation?: boolean
  className?: string
}

const triggerClassName =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:size-10'

/**
 * Unified «…» menu: dropdown on desktop, bottom action sheet on mobile.
 */
export function CardActionsMenu({
  actions,
  title = 'Действия',
  ariaLabel = 'Ещё действия',
  stopPropagation = true,
  className,
}: CardActionsMenuProps) {
  const isMobile = useIsMobile(639)
  const [open, setOpen] = useState(false)

  if (actions.length === 0) return null

  const stop = (event: React.SyntheticEvent) => {
    if (stopPropagation) event.stopPropagation()
  }

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className={cn(triggerClassName, className)}
          aria-label={ariaLabel}
          data-testid="card-actions-trigger"
          onClick={(event) => {
            stop(event)
            setOpen(true)
          }}
          onKeyDown={stop}
        >
          <MoreHorizontal className="size-5" />
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
            showCloseButton={false}
            onClick={stop}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
            <SheetHeader className="border-b border-border px-4 pb-3">
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <ul className="flex flex-col py-1" role="menu">
              {actions.map((action) => (
                <li key={action.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={cn(
                      'flex min-h-12 w-full items-center gap-3 px-4 text-left text-base font-medium',
                      action.variant === 'destructive'
                        ? 'text-destructive'
                        : 'text-foreground',
                      'hover:bg-muted/60 active:bg-muted',
                    )}
                    onClick={(event) => {
                      stop(event)
                      setOpen(false)
                      action.onSelect()
                    }}
                  >
                    {action.icon ? (
                      <action.icon className="size-5 shrink-0 opacity-80" aria-hidden />
                    ) : null}
                    {action.label}
                  </button>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(triggerClassName, className)}
        aria-label={ariaLabel}
        data-testid="card-actions-trigger"
        onClick={stop}
        onKeyDown={stop}
      >
        <MoreHorizontal className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-auto min-w-44 max-w-xs p-1.5"
        onClick={stop}
      >
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : undefined}
            className="min-h-9 gap-2.5 px-2.5 py-2 text-sm whitespace-nowrap"
            onClick={() => action.onSelect()}
          >
            {action.icon ? (
              <action.icon className="size-4 shrink-0 opacity-80" aria-hidden />
            ) : null}
            <span className="min-w-0">{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
