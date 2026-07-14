import { Controller, type Control, type Path } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useFields } from '@/features/fields/hooks'
import { useImplements } from '@/features/implements/hooks'

type ControlProps<T extends Record<string, unknown>> = {
  control: Control<T>
}

export function ShiftFieldSelect<T extends Record<string, unknown>>({
  control,
}: ControlProps<T>) {
  const { data: fields = [], isLoading } = useFields()
  const activeFields = fields.filter((item) => item.is_active)

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
                <Select
                  value={value || 'none'}
                  onValueChange={(next) => field.onChange((next === 'none' ? '' : next) as never)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {activeFields.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={value || 'none'}
                  onValueChange={(next) => field.onChange((next === 'none' ? '' : next) as never)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не выбрано</SelectItem>
                    {implementsList.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
