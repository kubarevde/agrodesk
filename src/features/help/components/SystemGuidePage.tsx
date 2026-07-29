import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, BookOpen, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { useUserPermissions } from '@/features/settings/permissionsHooks'
import { findGuideStepIndex, getGuideStepsForUser } from '../guide'
import { useGuideProgress } from '../hooks'

interface SystemGuidePageProps {
  /** From /support/guide?section=… */
  section?: string
}

export function SystemGuidePage({ section }: SystemGuidePageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: perms } = useUserPermissions(Boolean(user))
  const { progress, setStepIndex, complete, restart } = useGuideProgress()

  const steps = useMemo(() => {
    if (!user) return []
    return getGuideStepsForUser(user.role, perms?.allowedSections)
  }, [user, perms?.allowedSections])

  const initialIndex = useMemo(() => {
    const fromQuery = findGuideStepIndex(steps, section)
    if (fromQuery >= 0) return fromQuery
    const fromLast = findGuideStepIndex(steps, progress.lastSectionId ?? undefined)
    if (fromLast >= 0 && !progress.completedAt) return fromLast
    return Math.min(progress.stepIndex, Math.max(0, steps.length - 1))
  }, [steps, section, progress.lastSectionId, progress.stepIndex, progress.completedAt])

  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    setIndex(initialIndex)
  }, [initialIndex])

  const safeIndex = steps.length > 0 ? Math.min(index, steps.length - 1) : 0
  const step = steps[safeIndex]
  const isLast = safeIndex >= steps.length - 1
  const isFirst = safeIndex <= 0

  if (!user || !step) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Как пользоваться системой</h1>
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, next))
    setIndex(clamped)
    const nextStep = steps[clamped]
    setStepIndex(clamped, nextStep?.id ?? null)
  }

  const finish = () => {
    complete()
    void navigate({ to: '/support' })
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="size-5" aria-hidden />
          <span className="text-sm font-medium">Обучающий гайд</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">{step.title}</h1>
        <p className="text-sm text-muted-foreground">
          Шаг {safeIndex + 1} из {steps.length}
        </p>
        <progress
          className="h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
          value={safeIndex + 1}
          max={steps.length}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="leading-relaxed text-foreground">{step.body}</p>

        {step.tips && step.tips.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {step.tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {step.example ? (
          <div className="rounded-lg border border-border bg-background/80 p-3 text-sm">
            <p className="mb-1 font-medium text-foreground">Пример</p>
            <p className="leading-relaxed text-muted-foreground">{step.example}</p>
          </div>
        ) : null}

        {step.mistakes && step.mistakes.length > 0 ? (
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <AlertTriangle className="size-4 text-destructive" aria-hidden />
              Типичные ошибки
            </p>
            <ul className="space-y-2 text-muted-foreground">
              {step.mistakes.map((m) => (
                <li key={m} className="leading-relaxed">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {step.href ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => {
              const href = step.href
              if (!href) return
              void navigate({ to: href })
            }}
          >
            {step.hrefLabel ?? 'Открыть раздел'}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={isFirst}
          onClick={() => go(safeIndex - 1)}
        >
          <ChevronLeft className="size-4" />
          Назад
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {progress.completedAt ? (
            <Button type="button" variant="outline" className="min-h-11" onClick={restart}>
              Пройти заново
            </Button>
          ) : null}
          {isLast ? (
            <Button type="button" className="min-h-11" onClick={finish}>
              Готово
            </Button>
          ) : (
            <Button type="button" className="min-h-11" onClick={() => go(safeIndex + 1)}>
              Далее
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="link"
        className="h-auto px-0 text-muted-foreground"
        onClick={() => void navigate({ to: '/support' })}
      >
        Вернуться в поддержку
      </Button>
    </div>
  )
}
