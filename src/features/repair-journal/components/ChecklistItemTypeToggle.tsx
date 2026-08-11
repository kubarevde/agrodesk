import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ChecklistItemType } from '../types'

const OPTIONS: Array<{ value: ChecklistItemType; label: string }> = [
  { value: 'buy', label: 'Купить' },
  { value: 'repair', label: 'Отремонтировать' },
]

type ChecklistItemTypeToggleProps = {
  value: ChecklistItemType
  onChange: (value: ChecklistItemType) => void
  className?: string
  'aria-label'?: string
}

/** Two equal buttons — full label visible on mobile and desktop. */
export function ChecklistItemTypeToggle({
  value,
  onChange,
  className,
  'aria-label': ariaLabel = 'Тип пункта',
}: ChecklistItemTypeToggleProps) {
  return (
    <div
      className={cn('grid grid-cols-2 gap-2', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {OPTIONS.map((option) => {
        const active = value === option.value
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? 'default' : 'outline'}
            className="h-auto min-h-11 w-full whitespace-normal px-2 py-2.5 text-center text-sm leading-snug"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
