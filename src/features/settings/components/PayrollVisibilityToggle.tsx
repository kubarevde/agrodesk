type Props = {
  value: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}

export function PayrollVisibilityToggle({ value, disabled, onChange }: Props) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-border bg-surface px-3 py-3">
      <div className="space-y-0.5">
        <span className="text-sm font-medium text-foreground">
          Показывать начисления сотрудникам
        </span>
        <p className="text-xs text-muted-foreground">
          Если выключено, сотрудники видят смены и часы, но не денежные суммы. Руководители и
          администраторы видят суммы всегда.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={
          value
            ? 'relative h-6 w-11 shrink-0 rounded-full bg-success transition-colors disabled:opacity-50'
            : 'relative h-6 w-11 shrink-0 rounded-full bg-muted transition-colors disabled:opacity-50'
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
