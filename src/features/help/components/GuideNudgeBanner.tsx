import { useNavigate } from '@tanstack/react-router'
import { BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGuideProgress } from '../hooks'

/** Soft one-time nudge — not shown again after dismiss or complete. */
export function GuideNudgeBanner() {
  const navigate = useNavigate()
  const { showNudge, dismissNudge } = useGuideProgress()

  if (!showNudge) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex gap-3">
        <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Как пользоваться системой?</p>
          <p className="text-sm text-muted-foreground">
            Короткий гайд под вашу роль: куда заходить каждый день, как открыть смену и куда
            писать, если что-то непонятно.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="Скрыть"
          onClick={dismissNudge}
        >
          <X className="size-4" />
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1 sm:flex-none"
          onClick={() => void navigate({ to: '/support/guide' })}
        >
          Пройти гайд
        </Button>
      </div>
    </div>
  )
}
