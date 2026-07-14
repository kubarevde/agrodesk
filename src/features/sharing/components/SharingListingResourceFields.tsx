import { Controller, type Control, type UseFormSetValue, useWatch } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFields } from '@/features/fields/hooks'
import { useImplements } from '@/features/implements/hooks'
import { useEquipment } from '@/features/worktime/referenceHooks'
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

  if (type === 'parts') return null

  if (type === 'field') {
    return (
      <div className="space-y-2">
        <Label>Выбрать поле</Label>
        <Controller
          name="fieldId"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              value={field.value || undefined}
              disabled={disabledResource}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                const selected = fields.find((item) => item.id === value)
                setValue('lat', selected?.latitude ?? null)
                setValue('lng', selected?.longitude ?? null)
                if (selected && !title) setValue('title', `Аренда: ${selected.name}`)
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(fieldState.error)}>
                <SelectValue placeholder="Поле" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                    {item.area_ha != null ? ` — ${item.area_ha} га` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={field.value || undefined}
              disabled={disabledResource}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                const selected = equipment.find((item) => item.id === value)
                setValue('lat', selected?.latitude ?? null)
                setValue('lng', selected?.longitude ?? null)
                if (selected && !title) setValue('title', selected.name)
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(fieldState.error)}>
                <SelectValue placeholder="Техника" />
              </SelectTrigger>
              <SelectContent>
                {equipment.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={field.value || undefined}
              disabled={disabledResource}
              onValueChange={(value) => {
                field.onChange(value ?? '')
                const selected = implementsList.find((item) => item.id === value)
                if (selected && !title) setValue('title', selected.name)
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={Boolean(fieldState.error)}>
                <SelectValue placeholder="Приспособление" />
              </SelectTrigger>
              <SelectContent>
                {implementsList.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select
              value={field.value || 'none'}
              onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Не выбрано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не выбрано</SelectItem>
                {equipment.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </>
  )
}
