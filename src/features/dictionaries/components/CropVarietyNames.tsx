import { cn } from '@/lib/utils'
import type { CropVariety } from '../cropVarietyHooks'

type CropVarietyNamesProps = {
  varieties: CropVariety[]
  className?: string
}

/** Compact list of variety names under a crop (inactive dimmed). */
export function CropVarietyNames({ varieties, className }: CropVarietyNamesProps) {
  if (varieties.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>Сорта не заданы</p>
    )
  }

  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      <span className="text-muted-foreground/80">Сорта: </span>
      {varieties.map((variety, index) => (
        <span key={variety.id}>
          {index > 0 ? ', ' : null}
          <span className={variety.isActive ? 'text-foreground/80' : 'line-through opacity-60'}>
            {variety.name}
          </span>
        </span>
      ))}
    </p>
  )
}
