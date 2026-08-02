import { cn } from '@/lib/utils'
import type { GuideStep } from '../guide'

type GuideStepTocProps = {
  steps: GuideStep[]
  activeIndex: number
  onSelect: (index: number) => void
}

export function GuideStepToc({ steps, activeIndex, onSelect }: GuideStepTocProps) {
  return (
    <details className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
      <summary className="cursor-pointer list-none font-medium text-foreground [&::-webkit-details-marker]:hidden">
        Содержание гайда
      </summary>
      <ol className="mt-2 max-h-48 space-y-1 overflow-y-auto border-t border-border pt-2 text-muted-foreground">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={cn(
                'w-full rounded-md px-2 py-1.5 text-left',
                i === activeIndex
                  ? 'bg-primary/10 text-foreground'
                  : 'hover:bg-muted/50',
              )}
              onClick={() => onSelect(i)}
            >
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>
    </details>
  )
}
