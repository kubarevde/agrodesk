import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AutocompleteInput } from '@/components/shared/AutocompleteInput'
import { DateTimePicker } from '@/components/shared/DateTimePicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import { selectOptions } from '@/lib/selectOptions'
import { useDictionary } from '@/features/dictionaries/hooks'
import { useEmployees } from '@/features/employees/hooks'
import { useInventory } from '@/features/inventory/hooks'
import { getCategoryLabel, isHarvestCategory } from '@/features/inventory/utils'
import { CropVarietySelect } from '@/components/shared/CropVarietySelect'
import { FieldPlantingSelect } from '@/components/shared/FieldPlantingSelect'
import { useCreateShipmentRequest, useShipmentRequests } from '../hooks'
import { defaultPlannedAtIso } from '../labels'
import {
  selectableInventoryItemsForRequest,
  shipmentRequestItemOptionLabel,
} from '../itemSelect'
import type { ShipmentRequestPriority } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  /** Preselect ТМЦ (e.g. from inventory card). */
  initialInventoryItemId?: string | null
  /**
   * TMC outbound from «Отгрузки» tab: hide harvest/crop categories and items.
   * Title becomes «Добавить отгрузку ТМЦ».
   */
  inventoryOnly?: boolean
}

const PRIORITY_OPTIONS = selectOptions([
  { value: 'normal', label: 'Обычный' },
  { value: 'urgent', label: 'Срочный' },
])

const NONE_ASSIGNEE = 'none'
const NONE_CATEGORY = ''

export function ShipmentRequestFormDialog({
  open,
  onClose,
  initialInventoryItemId = null,
  inventoryOnly = false,
}: Props) {
  const { data: items = [], isLoading } = useInventory({ enabled: open })
  const { data: categories = [] } = useDictionary('inventory_category')
  const { data: employees = [] } = useEmployees({ enabled: open })
  const { data: existingRequests = [] } = useShipmentRequests({}, open)
  const create = useCreateShipmentRequest()
  const [category, setCategory] = useState(NONE_CATEGORY)
  const [inventoryItemId, setInventoryItemId] = useState(initialInventoryItemId ?? '')
  const [customerName, setCustomerName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [plannedLocal, setPlannedLocal] = useState('')
  const [priority, setPriority] = useState<ShipmentRequestPriority>('normal')
  const [assignedTo, setAssignedTo] = useState(NONE_ASSIGNEE)
  const [comment, setComment] = useState('')
  const [varietyId, setVarietyId] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [fieldPlantingId, setFieldPlantingId] = useState('')

  const customerSuggestions = useMemo(
    () =>
      [...new Set(existingRequests.map((row) => row.customerName.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'ru'),
      ),
    [existingRequests],
  )

  useEffect(() => {
    if (!open) return
    setInventoryItemId(initialInventoryItemId ?? '')
    setCustomerName('')
    setQuantity('')
    setPrice('')
    setPriority('normal')
    setAssignedTo(NONE_ASSIGNEE)
    setComment('')
    setVarietyId('')
    setFieldId('')
    setFieldPlantingId('')
    const iso = defaultPlannedAtIso()
    const local = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    setPlannedLocal(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`,
    )
  }, [open, initialInventoryItemId])

  // Prefill category from locked item (card → заявка).
  useEffect(() => {
    if (!open || !initialInventoryItemId) {
      if (open && !initialInventoryItemId) setCategory(NONE_CATEGORY)
      return
    }
    const item = items.find((row) => row.id === initialInventoryItemId)
    if (!item) return
    if (inventoryOnly && (isHarvestCategory(item.category) || item.isHarvest)) {
      setCategory(NONE_CATEGORY)
      setInventoryItemId('')
      return
    }
    setCategory(item.category)
    if (item.varietyId) setVarietyId(item.varietyId)
  }, [open, initialInventoryItemId, items, inventoryOnly])

  const selectedItem = useMemo(
    () => items.find((item) => item.id === inventoryItemId) ?? null,
    [items, inventoryItemId],
  )
  const isHarvest = Boolean(
    selectedItem && (isHarvestCategory(selectedItem.category) || selectedItem.isHarvest),
  )
  const harvestCropCode = isHarvest ? (selectedItem?.cropCode ?? null) : null
  const availableStock = selectedItem?.currentStock ?? null
  const qtyNum = Number(quantity)
  const overStock =
    availableStock != null && Number.isFinite(qtyNum) && qtyNum > availableStock
  const unit = (selectedItem?.unit ?? '').trim()
  const quantityLabel =
    !unit || unit === 'кг' ? 'Количество, кг' : `Количество, ${unit}`
  const priceLabel =
    !unit || unit === 'кг' ? 'Цена за килограмм' : `Цена за ${unit}`

  const categoryOptions = selectOptions(
    categories
      .filter((row) => !(inventoryOnly && isHarvestCategory(row.code)))
      .map((row) => ({
        value: row.code,
        label: row.name || getCategoryLabel(row.code),
      })),
  )
  const itemOptions = selectOptions(
    selectableInventoryItemsForRequest(items, category, {
      excludeHarvest: inventoryOnly,
    }).map((item) => ({
      value: item.id,
      label: shipmentRequestItemOptionLabel(item),
    })),
  )
  const employeeOptions = selectOptions([
    { value: NONE_ASSIGNEE, label: 'Не назначен' },
    ...employees
      .filter((row) => row.isActive)
      .map((row) => ({
        value: row.id,
        label: `${row.employeeName}${row.role === 'employee' ? '' : ` (${row.role})`}`,
      })),
  ])

  const itemLocked = Boolean(initialInventoryItemId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const qty = Number(quantity)
    const priceNum = Number(price)
    if (
      !category ||
      !inventoryItemId ||
      !customerName.trim() ||
      !(qty > 0) ||
      !(priceNum >= 0) ||
      !plannedLocal
    ) {
      return
    }
    await create.mutateAsync({
      inventoryItemId,
      customerName: customerName.trim(),
      quantity: qty,
      price: priceNum,
      plannedAt: new Date(plannedLocal).toISOString(),
      priority,
      assignedTo: assignedTo === NONE_ASSIGNEE ? null : assignedTo,
      comment: comment.trim() || null,
      ...(isHarvest
        ? {
            varietyId: varietyId || null,
            fieldId: fieldId || null,
            fieldPlantingId: fieldPlantingId || null,
          }
        : {}),
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {inventoryOnly ? 'Добавить отгрузку ТМЦ' : 'Заявка на отгрузку ТМЦ'}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="space-y-2">
            <Label>Категория ТМЦ</Label>
            <LabeledSelect
              value={category || null}
              onValueChange={(value) => {
                const next = value ?? NONE_CATEGORY
                setCategory(next)
                if (!itemLocked) setInventoryItemId('')
              }}
              options={categoryOptions}
              placeholder="Выберите категорию"
              disabled={itemLocked}
            />
          </div>
          <div className="space-y-2">
            <Label>ТМЦ</Label>
            <LabeledSelect
              value={inventoryItemId || null}
              onValueChange={(value) => {
                const next = value ?? ''
                setInventoryItemId(next)
                const item = items.find((row) => row.id === next)
                if (!item || !(isHarvestCategory(item.category) || item.isHarvest)) {
                  setVarietyId('')
                  setFieldId('')
                  setFieldPlantingId('')
                } else {
                  setVarietyId(item.varietyId ?? '')
                  setFieldPlantingId('')
                  setFieldId('')
                }
              }}
              options={itemOptions}
              placeholder={
                !category
                  ? 'Сначала выберите категорию'
                  : isLoading
                    ? 'Загрузка…'
                    : itemOptions.length === 0
                      ? 'Нет позиций в категории'
                      : 'Выберите позицию'
              }
              disabled={itemLocked || !category}
            />
            {selectedItem ? (
              <p className="text-xs text-muted-foreground">
                Доступно: {selectedItem.currentStock.toLocaleString('ru-RU')} {selectedItem.unit}
              </p>
            ) : null}
          </div>
          {isHarvest ? (
            <>
              <CropVarietySelect
                cropCode={harvestCropCode}
                value={varietyId}
                onChange={(id) => setVarietyId(id ?? '')}
                showWhenEmpty
              />
              <FieldPlantingSelect
                cropCode={harvestCropCode}
                value={fieldPlantingId}
                onChange={(id, planting) => {
                  setFieldPlantingId(id ?? '')
                  if (planting) {
                    setFieldId(planting.fieldId)
                    setVarietyId(planting.varietyId ?? '')
                  } else {
                    setFieldId('')
                  }
                }}
                label="Посев / происхождение (необязательно)"
                hideWhenEmpty
              />
            </>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="sr-customer">Покупатель</Label>
            <AutocompleteInput
              id="sr-customer"
              value={customerName}
              onChange={setCustomerName}
              suggestions={customerSuggestions}
              placeholder="ООО / ФИО"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sr-qty">{quantityLabel}</Label>
              <Input
                id="sr-qty"
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {overStock && availableStock != null ? (
                <p className="text-xs text-muted-foreground">
                  На складе недостаточно остатка для выполнения сейчас (
                  {availableStock.toLocaleString('ru-RU')} {selectedItem?.unit}). Заявку можно
                  сохранить и выполнить позже.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sr-price">{priceLabel}</Label>
              <Input
                id="sr-price"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-planned">План выполнения</Label>
            <DateTimePicker
              id="sr-planned"
              value={plannedLocal}
              onChange={setPlannedLocal}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Приоритет</Label>
            <LabeledSelect
              value={priority}
              onValueChange={(value) =>
                setPriority((value as ShipmentRequestPriority) || 'normal')
              }
              options={PRIORITY_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <Label>Ответственный</Label>
            <LabeledSelect
              value={assignedTo}
              onValueChange={(value) => setAssignedTo(value ?? NONE_ASSIGNEE)}
              options={employeeOptions}
              placeholder="Не назначен"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sr-comment">Комментарий</Label>
            <Textarea
              id="sr-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательно"
              rows={3}
              maxLength={2000}
              className="min-h-20"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {inventoryOnly ? 'Добавить отгрузку' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
