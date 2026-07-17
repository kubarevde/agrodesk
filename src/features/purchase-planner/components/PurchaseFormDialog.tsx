import { useEffect, useState } from 'react'
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
import { useEmployees } from '@/features/employees/hooks'
import { useEquipment } from '@/features/equipment/hooks'
import { useImplements } from '@/features/implements/hooks'
import { useInventory } from '@/features/inventory/hooks'
import { useCreatePurchaseItem, useUpdatePurchaseItem } from '../hooks'
import type {
  PurchaseCategory,
  PurchasePlannerItem,
  PurchaseUrgency,
} from '../types'

type PurchaseFormDialogProps = {
  open: boolean
  onClose: () => void
  item?: PurchasePlannerItem | null
}

const CATEGORY_OPTIONS = selectOptions([
  { value: 'equipment', label: 'Техника' },
  { value: 'implement', label: 'Приспособление' },
  { value: 'inventory_item', label: 'ТМЦ' },
  { value: 'general', label: 'Общее' },
])

const URGENCY_OPTIONS = selectOptions([
  { value: 'urgent', label: 'Срочно' },
  { value: 'normal', label: 'Обычный' },
  { value: 'low', label: 'Низкий' },
])

export function PurchaseFormDialog({ open, onClose, item }: PurchaseFormDialogProps) {
  const create = useCreatePurchaseItem()
  const update = useUpdatePurchaseItem()
  const { data: equipment = [] } = useEquipment({ is_active: true })
  const { data: implementsList = [] } = useImplements()
  const { data: inventory = [] } = useInventory()
  const { data: employees = [] } = useEmployees()

  const [title, setTitle] = useState(item?.title ?? '')
  const [category, setCategory] = useState<PurchaseCategory>(
    (item?.category as PurchaseCategory) || 'general',
  )
  const [equipmentId, setEquipmentId] = useState(item?.equipmentId ?? '')
  const [implementId, setImplementId] = useState(item?.implementId ?? '')
  const [inventoryId, setInventoryId] = useState(item?.inventoryItemId ?? '')
  const [urgency, setUrgency] = useState<PurchaseUrgency>(
    (item?.urgency as PurchaseUrgency) || 'normal',
  )
  const [place, setPlace] = useState(item?.purchasePlace ?? '')
  const [responsibleId, setResponsibleId] = useState(item?.responsibleId ?? '')
  const [cost, setCost] = useState(item?.estimatedCost?.toString() ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')

  useEffect(() => {
    if (!open) return
    setTitle(item?.title ?? '')
    setCategory((item?.category as PurchaseCategory) || 'general')
    setEquipmentId(item?.equipmentId ?? '')
    setImplementId(item?.implementId ?? '')
    setInventoryId(item?.inventoryItemId ?? '')
    setUrgency((item?.urgency as PurchaseUrgency) || 'normal')
    setPlace(item?.purchasePlace ?? '')
    setResponsibleId(item?.responsibleId ?? '')
    setCost(item?.estimatedCost?.toString() ?? '')
    setNotes(item?.notes ?? '')
  }, [open, item])

  const payloadBase = () => ({
    title: title.trim(),
    category,
    equipmentId: category === 'equipment' ? equipmentId || null : null,
    implementId: category === 'implement' ? implementId || null : null,
    inventoryItemId: category === 'inventory_item' ? inventoryId || null : null,
    urgency,
    purchasePlace: place.trim() || null,
    responsibleId: responsibleId || null,
    estimatedCost: cost === '' ? null : Number(cost),
    notes: notes.trim() || null,
  })

  const canSubmit =
    title.trim().length > 0 &&
    (category === 'general' ||
      (category === 'equipment' && Boolean(equipmentId)) ||
      (category === 'implement' && Boolean(implementId)) ||
      (category === 'inventory_item' && Boolean(inventoryId)))

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (item) {
      await update.mutateAsync({ id: item.id, payload: payloadBase() })
    } else {
      await create.mutateAsync(payloadBase())
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Редактировать закупку' : 'Новая закупка'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pp-title">Что купить</Label>
            <Input id="pp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <LabeledSelect
            label="Категория"
            value={category}
            options={CATEGORY_OPTIONS}
            hint="Для чего покупка: техника, приспособление, склад или общее"
            onValueChange={(v) => setCategory((v as PurchaseCategory) || 'general')}
          />
          {category === 'equipment' ? (
            <LabeledSelect
              label="Техника"
              value={equipmentId}
              options={selectOptions(equipment.map((e) => ({ value: e.id, label: e.name })))}
              placeholder="Выберите технику"
              onValueChange={(v) => setEquipmentId(v || '')}
            />
          ) : null}
          {category === 'implement' ? (
            <LabeledSelect
              label="Приспособление"
              value={implementId}
              options={selectOptions(
                implementsList.map((e) => ({ value: e.id, label: e.name })),
              )}
              placeholder="Выберите приспособление"
              onValueChange={(v) => setImplementId(v || '')}
            />
          ) : null}
          {category === 'inventory_item' ? (
            <LabeledSelect
              label="Позиция склада"
              value={inventoryId}
              options={selectOptions(inventory.map((e) => ({ value: e.id, label: e.name })))}
              placeholder="Выберите ТМЦ"
              onValueChange={(v) => setInventoryId(v || '')}
            />
          ) : null}
          <LabeledSelect
            label="Срочность"
            value={urgency}
            options={URGENCY_OPTIONS}
            onValueChange={(v) => setUrgency((v as PurchaseUrgency) || 'normal')}
          />
          <div className="space-y-1">
            <Label htmlFor="pp-place">Место покупки</Label>
            <Input
              id="pp-place"
              placeholder="не обязательно"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
          <LabeledSelect
            label="Ответственный"
            value={responsibleId}
            options={selectOptions([
              { value: '', label: 'Без ответственного' },
              ...employees.map((e) => ({ value: e.id, label: e.employeeName })),
            ])}
            placeholder="Не назначен"
            onValueChange={(v) => setResponsibleId(v || '')}
          />
          <div className="space-y-1">
            <Label htmlFor="pp-cost">Примерная стоимость</Label>
            <Input
              id="pp-cost"
              type="number"
              min={0}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pp-notes">Примечания</Label>
            <Textarea id="pp-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit || create.isPending || update.isPending}
            onClick={() => void handleSubmit()}
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
