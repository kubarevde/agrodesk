import { useNavigate } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGuideProgress } from '../hooks'

export function SupportGuideCard() {
  const navigate = useNavigate()
  const { progress, restart } = useGuideProgress()

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <BookOpen className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Как пользоваться системой</p>
          <p className="text-sm text-muted-foreground">
            Пошаговый гайд: меню, смена, склад, календарь и куда писать, если застряли.
            {progress.completedAt ? ' Можно пройти ещё раз.' : ''}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 shrink-0"
        onClick={() => {
          if (progress.completedAt) restart()
          void navigate({ to: '/support/guide' })
        }}
      >
        {progress.completedAt ? 'Пройти гайд снова' : 'Открыть гайд'}
      </Button>
    </div>
  )
}
