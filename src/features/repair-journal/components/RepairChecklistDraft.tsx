import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ChecklistItemInput, ChecklistItemType } from '../types'
import { ChecklistItemTypeToggle } from './ChecklistItemTypeToggle'

export type ChecklistDraftItem = ChecklistItemInput & { key: string }

type RepairChecklistDraftProps = {
  items: ChecklistDraftItem[]
  onChange: (items: ChecklistDraftItem[]) => void
}

function draftKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Draft checklist rows for create-repair dialog. */
export function RepairChecklistDraft({ items, onChange }: RepairChecklistDraftProps) {
  const updateRow = (key: string, patch: Partial<ChecklistDraftItem>) => {
    onChange(items.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Чек-лист</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9"
          onClick={() =>
            onChange([
              ...items,
              {
                key: draftKey(),
                itemType: 'buy' satisfies ChecklistItemType,
                description: '',
                cost: null,
              },
            ])
          }
        >
          <Plus className="mr-1 size-3.5" />
          Пункт
        </Button>
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          className="space-y-2 rounded-lg border border-border bg-muted/10 p-2.5"
        >
          <div className="space-y-1">
            <Label>Тип пункта</Label>
            <ChecklistItemTypeToggle
              value={item.itemType}
              onChange={(itemType) => updateRow(item.key, { itemType })}
              aria-label="Тип пункта чек-листа"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`checklist-desc-${item.key}`}>Что сделать</Label>
            <Input
              id={`checklist-desc-${item.key}`}
              placeholder="Например: купить ремень ГРМ"
              value={item.description}
              className="min-h-10"
              onChange={(e) => updateRow(item.key, { description: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`checklist-cost-${item.key}`}>Плановая стоимость, ₽</Label>
            <div className="flex gap-2">
              <Input
                id={`checklist-cost-${item.key}`}
                type="number"
                min={0}
                placeholder="Необязательно"
                className="min-h-10 min-w-0 flex-1"
                value={item.cost ?? ''}
                onChange={(e) =>
                  updateRow(item.key, {
                    cost: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-10 shrink-0"
                aria-label="Удалить пункт"
                onClick={() => onChange(items.filter((row) => row.key !== item.key))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
