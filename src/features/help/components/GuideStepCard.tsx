import { AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GuideStep } from '../guide'

type GuideStepCardProps = {
  step: GuideStep
  onOpenHref: (href: string) => void
}

export function GuideStepCard({ step, onOpenHref }: GuideStepCardProps) {
  return (
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
          <p className="mb-1 font-medium text-foreground">Как сделать</p>
          <p className="leading-relaxed text-muted-foreground">{step.example}</p>
        </div>
      ) : null}

      {step.mistakes && step.mistakes.length > 0 ? (
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
            Частые ошибки
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
            if (step.href) onOpenHref(step.href)
          }}
        >
          {step.hrefLabel ?? 'Открыть раздел'}
        </Button>
      ) : null}
    </div>
  )
}
