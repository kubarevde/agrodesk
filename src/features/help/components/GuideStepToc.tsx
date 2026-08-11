import { cn } from '@/lib/utils'
import type { GuideStep } from '../guide'

type GuideStepTocProps = {
  steps: GuideStep[]
  activeIndex: number
  onSelect: (index: number) => void
  /** accordion = mobile collapsible; sidebar = sticky list on desktop */
  variant?: 'accordion' | 'sidebar'
  className?: string
}

function TocList({
  steps,
  activeIndex,
  onSelect,
  className,
}: {
  steps: GuideStep[]
  activeIndex: number
  onSelect: (index: number) => void
  className?: string
}) {
  return (
    <ol className={cn('space-y-1 text-sm text-muted-foreground', className)}>
      {steps.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            className={cn(
              'w-full rounded-md px-2 py-1.5 text-left transition-colors',
              i === activeIndex
                ? 'bg-primary/10 font-medium text-foreground'
                : 'hover:bg-muted/50',
            )}
            onClick={() => onSelect(i)}
          >
            <span className="text-muted-foreground">{i + 1}.</span> {s.title}
          </button>
        </li>
      ))}
    </ol>
  )
}

export function GuideStepToc({
  steps,
  activeIndex,
  onSelect,
  variant = 'accordion',
  className,
}: GuideStepTocProps) {
  if (variant === 'sidebar') {
    return (
      <nav
        className={cn(
          'sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-border bg-surface p-3',
          className,
        )}
        aria-label="Содержание гайда"
      >
        <p className="mb-2 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Содержание
        </p>
        <TocList steps={steps} activeIndex={activeIndex} onSelect={onSelect} />
      </nav>
    )
  }

  return (
    <details
      className={cn('rounded-xl border border-border bg-surface px-3 py-2 text-sm', className)}
    >
      <summary className="cursor-pointer list-none font-medium text-foreground [&::-webkit-details-marker]:hidden">
        Содержание гайда
      </summary>
      <TocList
        steps={steps}
        activeIndex={activeIndex}
        onSelect={onSelect}
        className="mt-2 max-h-48 overflow-y-auto border-t border-border pt-2"
      />
    </details>
  )
}
