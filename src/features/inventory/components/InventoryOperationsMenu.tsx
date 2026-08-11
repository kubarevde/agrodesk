import { useMemo, useState } from 'react'
import { ArrowLeftRight, ChevronDown, Minus, Plus, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

type InventoryOperationsMenuProps = {
  onIncome: () => void
  onExpense: () => void
  onAdjust: () => void
  className?: string
}

type OpAction = {
  id: 'income' | 'expense' | 'adjust'
  label: string
  icon: typeof Plus
  onSelect: () => void
  variant?: 'default' | 'destructive'
}

/**
 * Single entry for warehouse stock ops: income / expense / adjustment.
 * Desktop: dropdown; mobile: bottom sheet.
 */
export function InventoryOperationsMenu({
  onIncome,
  onExpense,
  onAdjust,
  className,
}: InventoryOperationsMenuProps) {
  const isMobile = useIsMobile(639)
  const [open, setOpen] = useState(false)

  const actions = useMemo(
    (): OpAction[] => [
      { id: 'income', label: 'Приход', icon: Plus, onSelect: onIncome },
      {
        id: 'expense',
        label: 'Расход',
        icon: Minus,
        onSelect: onExpense,
        variant: 'destructive',
      },
      {
        id: 'adjust',
        label: 'Корректировка',
        icon: SlidersHorizontal,
        onSelect: onAdjust,
      },
    ],
    [onAdjust, onExpense, onIncome],
  )

  const triggerClassName = cn(
    'min-h-11 w-full justify-center sm:min-h-8 sm:w-auto',
    className,
  )

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          className={triggerClassName}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <ArrowLeftRight className="size-4" />
          Операция
          <ChevronDown className="size-4 opacity-80" />
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
            showCloseButton={false}
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
            <SheetHeader className="border-b border-border px-4 pb-3">
              <SheetTitle>Складская операция</SheetTitle>
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
                    onClick={() => {
                      setOpen(false)
                      window.setTimeout(() => action.onSelect(), 0)
                    }}
                  >
                    <action.icon className="size-5 shrink-0 opacity-80" aria-hidden />
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button type="button" className={triggerClassName} aria-label="Складская операция">
            <ArrowLeftRight className="size-4" />
            Операция
            <ChevronDown className="size-4 opacity-80" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="!w-auto min-w-48 max-w-xs p-1.5">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            variant={action.variant === 'destructive' ? 'destructive' : undefined}
            className="min-h-9 gap-2.5 px-2.5 py-2 text-sm whitespace-nowrap"
            onClick={() => action.onSelect()}
          >
            <action.icon className="size-4 shrink-0 opacity-80" aria-hidden />
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
