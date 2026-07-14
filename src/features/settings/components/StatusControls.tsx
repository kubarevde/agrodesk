import { Badge } from '@/components/ui/badge'

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-border bg-muted text-muted-foreground'
      }
    >
      {isActive ? 'Активен' : 'Неактивен'}
    </Badge>
  )
}

export function ActiveToggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <span className="text-sm text-foreground">Активен</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={
          value
            ? 'relative h-6 w-11 rounded-full bg-success transition-colors'
            : 'relative h-6 w-11 rounded-full bg-muted transition-colors'
        }
      >
        <span
          className={
            value
              ? 'absolute top-0.5 left-5 size-5 rounded-full bg-white shadow transition-all'
              : 'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-all'
          }
        />
      </button>
    </label>
  )
}
