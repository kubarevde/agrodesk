import { Clock, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShiftsEmptyStateProps {
  onOpenShift: () => void
}

export function ShiftsEmptyState({ onOpenShift }: ShiftsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Clock className="size-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">Смен за этот период нет</p>
      <Button onClick={onOpenShift} className="bg-primary hover:bg-primary-hover text-primary-foreground">
        <Play className="size-4" />
        Открыть первую смену
      </Button>
    </div>
  )
}
