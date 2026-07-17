import { cn } from '@/lib/utils'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** lg — главный переключатель (режим planner), md — вторичный (статусы) */
  size?: 'md' | 'lg'
  className?: string
  ariaLabel?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full rounded-xl bg-muted/80 p-1',
        size === 'lg' ? 'gap-1' : 'gap-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'flex-1 rounded-lg font-medium transition-colors',
              size === 'lg' ? 'min-h-11 px-3 py-2.5 text-sm' : 'min-h-9 px-2 py-1.5 text-xs sm:text-sm',
              active
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
