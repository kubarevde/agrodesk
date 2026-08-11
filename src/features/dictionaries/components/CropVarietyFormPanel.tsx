import { AutocompleteInput } from '@/components/shared/AutocompleteInput'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { CropVariety } from '../cropVarietyHooks'

type CropVarietyFormPanelProps = {
  editing: CropVariety | null
  name: string
  onNameChange: (value: string) => void
  existingNames: string[]
  pending: boolean
  onSave: () => void
  onCancel: () => void
}

/** Inline form inside the varieties sheet (avoids Dialog under Sheet z-index). */
export function CropVarietyFormPanel({
  editing,
  name,
  onNameChange,
  existingNames,
  pending,
  onSave,
  onCancel,
}: CropVarietyFormPanelProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">
        {editing ? 'Переименовать сорт' : 'Новый сорт'}
      </p>
      <div className="space-y-2">
        <Label htmlFor="variety-name">Название</Label>
        <AutocompleteInput
          id="variety-name"
          value={name}
          onChange={onNameChange}
          suggestions={existingNames.filter(Boolean)}
          placeholder="Например: Гала"
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button
          type="button"
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
          disabled={!name.trim() || pending}
          onClick={onSave}
        >
          Сохранить
        </Button>
      </div>
    </div>
  )
}
