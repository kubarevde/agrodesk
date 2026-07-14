import { useMemo } from 'react'
import { Controller, type Control, type UseFormSetValue, useWatch } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { useFields } from '@/features/fields/hooks'
import { useImplements } from '@/features/implements/hooks'
import { useEquipment } from '@/features/worktime/referenceHooks'
import { entityOptions } from '@/lib/selectOptions'
import type { SharingListingFormValues } from '../schemas'

type Props = {
  control: Control<SharingListingFormValues>
  setValue: UseFormSetValue<SharingListingFormValues>
  disabledResource?: boolean
}

export function SharingListingResourceFields({
  control,
  setValue,
  disabledResource,
}: Props) {
  const type = useWatch({ control, name: 'type' })
  const title = useWatch({ control, name: 'title' })
  const { data: fields = [] } = useFields()
  const { data: equipment = [] } = useEquipment()
  const { data: implementsList = [] } = useImplements()

  const fieldOptions = useMemo(
    () =>
      entityOptions(fields, (item) => item.id, (item) =>
        item.area_ha != null ? `${item.name} — ${item.area_ha} га` : item.name,
      ),
    [fields],
  )
  const equipmentOptions = useMemo(
    () =>
      entityOptions(equipment, (item) => item.id, (item) =>
        item.type ? `${item.name} (${item.type})` : item.name,
      ),
    [equipment],
  )
  const implementOptions = useMemo(
    () =>
      entityOptions(implementsList, (item) => item.id, (item) =>
        item.category ? `${item.name} (${item.category})` : item.name,
      ),
    [implementsList],
  )
  const relatedEquipmentOptions = useMemo(
    () =>
      entityOptions(
        equipment,
        (item) => item.id,
        (item) => item.name,
        [{ value: 'none', label: 'Не выбрано' }],
      ),
    [equipment],
  )

  if (type === 'parts') return null

  if (type === 'field') {
    return (
      <div className="space-y-2">
        <Label>Выбрать поле</Label>
        <Controller
          name="fieldId"
          control={control}
          render={({ field, fieldState }) => (
            <LabeledSelect
              value={field.value}
              disabled={disabledResource}
              options={fieldOptions}
              placeholder="Поле"
              aria-invalid={Boolean(fieldState.error)}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                const selected = fields.find((item) => item.id === value)
                setValue('lat', selected?.latitude ?? null)
                setValue('lng', selected?.longitude ?? null)
                if (selected && !title) setValue('title', `Аренда: ${selected.name}`)
              }}
            />
          )}
        />
      </div>
    )
  }

  if (type === 'equipment') {
    return (
      <div className="space-y-2">
        <Label>Выбрать технику</Label>
        <Controller
          name="equipmentId"
          control={control}
          render={({ field, fieldState }) => (
            <LabeledSelect
              value={field.value}
              disabled={disabledResource}
              options={equipmentOptions}
              placeholder="Техника"
              aria-invalid={Boolean(fieldState.error)}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                const selected = equipment.find((item) => item.id === value)
                setValue('lat', selected?.latitude ?? null)
                setValue('lng', selected?.longitude ?? null)
                if (selected && !title) setValue('title', selected.name)
              }}
            />
          )}
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Выбрать приспособление</Label>
        <Controller
          name="implementId"
          control={control}
          render={({ field, fieldState }) => (
            <LabeledSelect
              value={field.value}
              disabled={disabledResource}
              options={implementOptions}
              placeholder="Приспособление"
              aria-invalid={Boolean(fieldState.error)}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                const selected = implementsList.find((item) => item.id === value)
                if (selected && !title) setValue('title', selected.name)
              }}
            />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label>
          Связанная техника <span className="text-muted-foreground">(необязательно)</span>
        </Label>
        <Controller
          name="relatedEquipmentId"
          control={control}
          render={({ field }) => (
            <LabeledSelect
              value={field.value || 'none'}
              options={relatedEquipmentOptions}
              placeholder="Не выбрано"
              onValueChange={(value) =>
                field.onChange(!value || value === 'none' ? '' : value)
              }
            />
          )}
        />
      </div>
    </>
  )
}
