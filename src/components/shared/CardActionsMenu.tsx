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
  /** Stop parent card/row click handlers */
  stopPropagation?: boolean
  /** Notify parent when open state changes (e.g. suppress card navigation on close) */
  onOpenChange?: (open: boolean) => void
  className?: string
  /**
   * Raise menu above sheets/drawers (z-[1100]).
   * Use inside Sheet so desktop dropdown is not hidden behind it.
   */
  elevated?: boolean
}

const triggerClassName =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:size-10'

/**
 * Unified «…» menu (Fields card pattern):
 * - desktop: dropdown with full-width labels (not clipped to trigger width)
 * - mobile: bottom action sheet (not a side drawer)
 */
export function CardActionsMenu({
  actions,
  title = 'Действия',
  ariaLabel = 'Ещё действия',
  stopPropagation = true,
  onOpenChange,
  className,
  elevated = false,
}: CardActionsMenuProps) {
  const isMobile = useIsMobile(639)
  const [open, setOpen] = useState(false)

  if (actions.length === 0) return null

  const stop = (event: React.SyntheticEvent) => {
    if (stopPropagation) event.stopPropagation()
  }

  const setMenuOpen = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className={cn(triggerClassName, className)}
          aria-label={ariaLabel}
          data-testid="card-actions-trigger"
          onPointerDown={stop}
          onClick={(event) => {
            stop(event)
            setMenuOpen(true)
          }}
          onKeyDown={stop}
        >
          <MoreHorizontal className="size-5" />
        </button>
        <Sheet
          open={open}
          onOpenChange={(next) => {
            setMenuOpen(next)
          }}
        >
          <SheetContent
            side="bottom"
            className={cn(
              'gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2',
              elevated && 'z-[1200]',
            )}
            overlayClassName={elevated ? 'z-[1200]' : undefined}
            showCloseButton={false}
            onPointerDown={stop}
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
                      setMenuOpen(false)
                      // Defer action so sheet close + card ghost-click settle first.
                      window.setTimeout(() => action.onSelect(), 0)
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
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setMenuOpen(next)
      }}
      modal={!elevated}
    >
      <DropdownMenuTrigger
        className={cn(triggerClassName, className)}
        aria-label={ariaLabel}
        data-testid="card-actions-trigger"
        onPointerDown={stop}
        onClick={stop}
        onKeyDown={stop}
      >
        <MoreHorizontal className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={cn('!w-auto min-w-48 max-w-xs p-1.5', elevated && 'z-[1200]')}
        positionerClassName={elevated ? 'z-[1200]' : undefined}
        onClick={stop}
        onPointerDown={stop}
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
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
