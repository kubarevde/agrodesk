import { ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useHoldingContext,
  useHoldingSwitchBack,
} from '@/features/holding/hooks'

export function HoldingContextBanner() {
  const ctx = useHoldingContext()
  const switchBack = useHoldingSwitchBack()

  if (!ctx) return null

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm"
      data-testid="holding-context-banner"
      role="status"
    >
      <p className="flex min-w-0 items-center gap-2 text-foreground">
        <Building2 className="size-4 shrink-0 text-primary" />
        <span className="truncate">
          Контекст КФХ «{ctx.childOrgName}» · из головной «{ctx.headOrgName}»
          <span className="text-muted-foreground"> (не обычный вход)</span>
        </span>
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={switchBack.isPending}
        onClick={() => switchBack.mutate()}
        data-testid="holding-switch-back"
      >
        <ArrowLeft className="size-3.5" />
        В головную
      </Button>
    </div>
  )
}
