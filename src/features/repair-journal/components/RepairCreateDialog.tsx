import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import { selectOptions } from '@/lib/selectOptions'
import { useEquipment } from '@/features/equipment/hooks'
import { useImplements } from '@/features/implements/hooks'
import { useCreateRepair } from '../hooks'
import type { ChecklistItemInput, ChecklistItemType, RepairPriority } from '../types'

type RepairCreateDialogProps = {
  open: boolean
  onClose: () => void
  defaultEquipmentId?: string
  defaultImplementId?: string
}

type DraftItem = ChecklistItemInput & { key: string }

const PRIORITY_OPTIONS = selectOptions([
  { value: 'urgent', label: 'Срочно' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low', label: 'Низкий' },
])

const TYPE_OPTIONS = selectOptions([
  { value: 'buy', label: 'Купить' },
  { value: 'repair', label: 'Отремонтировать' },
])

export function RepairCreateDialog({
  open,
  onClose,
  defaultEquipmentId,
  defaultImplementId,
}: RepairCreateDialogProps) {
  const create = useCreateRepair()
  const { data: equipment = [] } = useEquipment({ is_active: true })
  const { data: implementsList = [] } = useImplements()
  const [assetKind, setAssetKind] = useState<'equipment' | 'implement'>(
    defaultImplementId && !defaultEquipmentId ? 'implement' : 'equipment',
  )
  const [equipmentId, setEquipmentId] = useState(defaultEquipmentId ?? '')
  const [implementId, setImplementId] = useState(defaultImplementId ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<RepairPriority>('normal')
  const [items, setItems] = useState<DraftItem[]>([])

  const equipmentOptions = selectOptions(
    equipment.map((item) => ({ value: item.id, label: item.name })),
  )
  const implementOptions = selectOptions(
    implementsList.map((item) => ({ value: item.id, label: item.name })),
  )

  const reset = () => {
    setDescription('')
    setPriority('normal')
    setItems([])
    setDate(new Date().toISOString().slice(0, 10))
  }

  const handleSubmit = async () => {
    const eq = assetKind === 'equipment' ? equipmentId || null : null
    const impl = assetKind === 'implement' ? implementId || null : null
    if (!eq && !impl) return
    await create.mutateAsync({
      equipmentId: eq,
      implementId: impl,
      date,
      type: 'Ремонт',
      description: description.trim() || null,
      priority,
      checklistItems: items
        .filter((item) => item.description.trim())
        .map(({ itemType, description: text, cost }) => ({
          itemType,
          description: text.trim(),
          cost: cost ?? null,
        })),
    })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Постановка на ремонт</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={assetKind === 'equipment' ? 'default' : 'outline'}
              onClick={() => setAssetKind('equipment')}
            >
              Техника
            </Button>
            <Button
              type="button"
              size="sm"
              variant={assetKind === 'implement' ? 'default' : 'outline'}
              onClick={() => setAssetKind('implement')}
            >
              Приспособление
            </Button>
          </div>
          {assetKind === 'equipment' ? (
            <LabeledSelect
              label="Техника"
              value={equipmentId}
              options={equipmentOptions}
              placeholder="Выберите технику"
              onValueChange={(v) => setEquipmentId(v || '')}
            />
          ) : (
            <LabeledSelect
              label="Приспособление"
              value={implementId}
              options={implementOptions}
              placeholder="Выберите приспособление"
              onValueChange={(v) => setImplementId(v || '')}
            />
          )}
          <div className="space-y-1">
            <Label htmlFor="repair-date">Дата постановки</Label>
            <Input id="repair-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <LabeledSelect
            label="Приоритет"
            value={priority}
            options={PRIORITY_OPTIONS}
            onValueChange={(v) => setPriority((v as RepairPriority) || 'normal')}
          />
          <div className="space-y-1">
            <Label htmlFor="repair-desc">Описание проблемы</Label>
            <Textarea
              id="repair-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Чек-лист</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { key: crypto.randomUUID(), itemType: 'buy', description: '', cost: null },
                  ])
                }
              >
                <Plus className="mr-1 size-3.5" />
                Пункт
              </Button>
            </div>
            {items.map((item) => (
              <div key={item.key} className="space-y-2 rounded-lg border border-border p-2">
                <LabeledSelect
                  label="Тип пункта"
                  value={item.itemType}
                  options={TYPE_OPTIONS}
                  onValueChange={(v) =>
                    setItems((prev) =>
                      prev.map((row) =>
                        row.key === item.key
                          ? { ...row, itemType: (v as ChecklistItemType) || 'buy' }
                          : row,
                      ),
                    )
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor={`checklist-desc-${item.key}`}>Что сделать</Label>
                  <Input
                    id={`checklist-desc-${item.key}`}
                    placeholder="Например: купить ремень ГРМ"
                    value={item.description}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((row) =>
                        row.key === item.key ? { ...row, description: e.target.value } : row,
                      ),
                    )
                  }
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
                    value={item.cost ?? ''}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row) =>
                          row.key === item.key
                            ? {
                                ...row,
                                cost: e.target.value === '' ? null : Number(e.target.value),
                              }
                            : row,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setItems((prev) => prev.filter((row) => row.key !== item.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={create.isPending || (assetKind === 'equipment' ? !equipmentId : !implementId)}
            onClick={() => void handleSubmit()}
          >
            Поставить на ремонт
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
