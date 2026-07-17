import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FieldOption = { id: string; name: string }

type AgroPlanFieldsPickerProps = {
  fields: FieldOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  error?: string
}

export function AgroPlanFieldsPicker({
  fields,
  selectedIds,
  onChange,
  error,
}: AgroPlanFieldsPickerProps) {
  const selectedSet = new Set(selectedIds)

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id))
      return
    }
    onChange([...selectedIds, id])
  }

  const selectedFields = fields.filter((field) => selectedSet.has(field.id))

  return (
    <div className="space-y-2">
      <Label>
        Поля
        <span className="text-destructive"> *</span>
      </Label>

      {selectedFields.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedFields.map((field) => (
            <Badge key={field.id} variant="secondary" className="gap-1">
              {field.name}
              <button
                type="button"
                className="ml-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`Убрать ${field.name}`}
                onClick={() => toggle(field.id)}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          'max-h-40 space-y-1 overflow-y-auto rounded-lg border border-input p-2',
          error && 'border-destructive',
        )}
      >
        {fields.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">Нет доступных полей</p>
        ) : (
          fields.map((field) => {
            const checked = selectedSet.has(field.id)
            return (
              <label
                key={field.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50',
                  checked && 'bg-primary/5',
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  onChange={() => toggle(field.id)}
                />
                <span className="text-foreground">{field.name}</span>
              </label>
            )
          })
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
