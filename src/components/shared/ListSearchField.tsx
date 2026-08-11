import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ListSearchFieldProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'aria-label'?: string
  className?: string
  /** Match tall controls (e.g. lg SegmentedControl) on desktop. */
  inputSize?: 'md' | 'lg'
}

/** Search field matching ТМЦ list UI (icon + mobile height). */
export function ListSearchField({
  value,
  onChange,
  placeholder = 'Поиск…',
  'aria-label': ariaLabel = 'Поиск',
  className,
  inputSize = 'md',
}: ListSearchFieldProps) {
  return (
    <div className={cn('relative min-w-0 flex-1 sm:max-w-sm', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn('pl-9', inputSize === 'lg' ? 'min-h-11' : 'min-h-11 sm:min-h-9')}
        aria-label={ariaLabel}
      />
    </div>
  )
}
