import { useMemo } from 'react'
import { Controller, type Control, type Path } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFields } from '@/features/fields/hooks'
import { useImplements } from '@/features/implements/hooks'
import { entityOptions } from '@/lib/selectOptions'

type ControlProps<T extends Record<string, unknown>> = {
  control: Control<T>
}

export function ShiftFieldSelect<T extends Record<string, unknown>>({
  control,
}: ControlProps<T>) {
  const { data: fields = [], isLoading } = useFields()
  const activeFields = fields.filter((item) => item.is_active)
  const options = useMemo(
    () =>
      entityOptions(
        activeFields,
        (item) => item.id,
        (item) => {
          const meta = [
            item.crop_type,
            item.area_ha != null ? `${item.area_ha} га` : null,
          ]
            .filter(Boolean)
            .join(', ')
          return meta ? `${item.name} (${meta})` : item.name
        },
        [{ value: 'none', label: 'Не выбрано' }],
      ),
    [activeFields],
  )

  return (
    <div className="space-y-2">
      <Label>
        Поле <span className="text-muted-foreground">(необязательно)</span>
      </Label>
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <Controller
          name={'fieldId' as Path<T>}
          control={control}
          render={({ field }) => {
            const value = typeof field.value === 'string' ? field.value : ''
            const selected = activeFields.find((item) => item.id === value)
            return (
              <div className="space-y-1.5">
                <LabeledSelect
                  value={value || 'none'}
                  onValueChange={(next) =>
                    field.onChange((!next || next === 'none' ? '' : next) as never)
                  }
                  options={options}
                  placeholder="Не выбрано"
                />
                {selected ? (
                  <p className="text-xs text-muted-foreground">
                    {[
                      selected.crop_type,
                      selected.area_ha != null ? `${selected.area_ha} га` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Нет данных о культуре'}
                  </p>
                ) : null}
              </div>
            )
          }}
        />
      )}
    </div>
  )
}

type ImplementProps<T extends Record<string, unknown>> = ControlProps<T> & {
  equipmentId?: string
}

export function ShiftImplementSelect<T extends Record<string, unknown>>({
  control,
  equipmentId,
}: ImplementProps<T>) {
  const { data: implementsList = [], isLoading } = useImplements()
  const options = useMemo(
    () =>
      entityOptions(
        implementsList,
        (item) => item.id,
        (item) => (item.category ? `${item.name} (${item.category})` : item.name),
        [{ value: 'none', label: 'Не выбрано' }],
      ),
    [implementsList],
  )

  if (!equipmentId) return null

  return (
    <div className="space-y-2">
      <Label>
        Приспособление <span className="text-muted-foreground">(необязательно)</span>
      </Label>
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <Controller
          name={'implementId' as Path<T>}
          control={control}
          render={({ field }) => {
            const value = typeof field.value === 'string' ? field.value : ''
            const selected = implementsList.find((item) => item.id === value)
            return (
              <div className="space-y-1.5">
                <LabeledSelect
                  value={value || 'none'}
                  onValueChange={(next) =>
                    field.onChange((!next || next === 'none' ? '' : next) as never)
                  }
                  options={options}
                  placeholder="Не выбрано"
                />
                {selected?.current_equipment_name ? (
                  <p className="text-xs text-muted-foreground">
                    Сейчас на: {selected.current_equipment_name}
                  </p>
                ) : selected ? (
                  <p className="text-xs text-muted-foreground">Сейчас свободно</p>
                ) : null}
              </div>
            )
          }}
        />
      )}
    </div>
  )
}
