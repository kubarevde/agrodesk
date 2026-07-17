import { MapPin } from 'lucide-react'
import type { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { SingleImageUploader } from '@/components/shared/SingleImageUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EquipmentFormValues } from '../schemas'
import { EQUIPMENT_TYPES, METER_TYPE_OPTIONS } from '../types'
import { numberInputRegister } from '@/lib/formNumbers'

type EquipmentFormFieldsProps = {
  control: Control<EquipmentFormValues>
  register: UseFormRegister<EquipmentFormValues>
  setValue: UseFormSetValue<EquipmentFormValues>
  watch: UseFormWatch<EquipmentFormValues>
}

export function EquipmentFormFields({
  control,
  register,
  setValue,
  watch,
}: EquipmentFormFieldsProps) {
  const meterType = watch('meter_type')
  const unit = meterType === 'km' ? 'км' : meterType === 'shift_hours' ? 'ч' : 'мч'

  const fillGeolocation = () => {
    if (!navigator.geolocation) {
      toast.error('Геолокация недоступна')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', Number(pos.coords.latitude.toFixed(6)))
        setValue('longitude', Number(pos.coords.longitude.toFixed(6)))
        toast.success('Координаты подставлены')
      },
      () => toast.error('Не удалось получить координаты'),
    )
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="eq-name">Название</Label>
        <Input id="eq-name" {...register('name')} />
      </div>

      <div className="space-y-2">
        <Label>Тип</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              items={EQUIPMENT_TYPES.map((type) => ({ value: type, label: type }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="eq-year">Год выпуска</Label>
          <Input
            id="eq-year"
            type="number"
            {...register('year_of_manufacture', {
              setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
            })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-serial">Серийный номер</Label>
          <Input id="eq-serial" {...register('serial_number')} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Тип счётчика</Label>
        <Controller
          name="meter_type"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              {METER_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2"
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={field.value === option.value}
                    onChange={() => field.onChange(option.value)}
                  />
                  <span>
                    <span className="block text-sm text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="eq-meter">Текущий показатель</Label>
          <Input
            id="eq-meter"
            type="number"
            step="any"
            {...register('current_meter', numberInputRegister)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-interval">Интервал ТО (каждые X {unit})</Label>
          <Input
            id="eq-interval"
            type="number"
            step="any"
            {...register('to_interval', {
              setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="eq-lat">Широта</Label>
          <Input
            id="eq-lat"
            type="number"
            step="any"
            {...register('latitude', {
              setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
            })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eq-lng">Долгота</Label>
          <Input
            id="eq-lng"
            type="number"
            step="any"
            {...register('longitude', {
              setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
            })}
          />
        </div>
      </div>

      <Button type="button" variant="outline" onClick={fillGeolocation}>
        <MapPin className="size-4" />
        Мои координаты
      </Button>

      <div className="space-y-2">
        <Label>Фото</Label>
        <Controller
          name="image_url"
          control={control}
          render={({ field }) => (
            <SingleImageUploader
              folder="equipment"
              value={field.value ?? null}
              onChange={(url) => field.onChange(url ?? undefined)}
            />
          )}
        />
      </div>
    </>
  )
}
