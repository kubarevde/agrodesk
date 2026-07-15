import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrganizationSettings, useUpdateOrganizationSettings } from '../hooks'

const TIMEZONE_LABELS: Record<string, string> = {
  'Asia/Bangkok': 'Бангкок (Asia/Bangkok)',
  'Asia/Novosibirsk': 'Новосибирск (Asia/Novosibirsk)',
  'Asia/Yekaterinburg': 'Екатеринбург (Asia/Yekaterinburg)',
  'Europe/Moscow': 'Москва (Europe/Moscow)',
  'Europe/Samara': 'Самара (Europe/Samara)',
  'Asia/Krasnoyarsk': 'Красноярск (Asia/Krasnoyarsk)',
  'Asia/Irkutsk': 'Иркутск (Asia/Irkutsk)',
  'Asia/Vladivostok': 'Владивосток (Asia/Vladivostok)',
  UTC: 'UTC',
}

export function TimezoneTab() {
  const { data, isLoading, isError } = useOrganizationSettings()
  const update = useUpdateOrganizationSettings()
  const [timezone, setTimezone] = useState('Asia/Bangkok')

  useEffect(() => {
    if (data?.timezone) setTimezone(data.timezone)
  }, [data?.timezone])

  if (isLoading) return <PageSkeleton />
  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">
        Не удалось загрузить настройки организации. Нужны права администратора.
      </p>
    )
  }

  const options = data.available_timezones?.length
    ? data.available_timezones
    : Object.keys(TIMEZONE_LABELS)

  return (
    <div className="max-w-md space-y-4 rounded-lg border border-border bg-surface p-4">
      <div className="space-y-2">
        <Label>Часовой пояс организации</Label>
        <Select
          value={timezone}
          onValueChange={(value) => {
            if (value) setTimezone(value)
          }}
          items={options.map((tz) => ({
            value: tz,
            label: TIMEZONE_LABELS[tz] ?? tz,
          }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите пояс" />
          </SelectTrigger>
          <SelectContent>
            {options.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {TIMEZONE_LABELS[tz] ?? tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Используется для дат смен, ТО и отчётов в вашей организации.
        </p>
      </div>
      <Button
        type="button"
        disabled={update.isPending || timezone === data.timezone}
        className="bg-primary hover:bg-primary-hover text-primary-foreground"
        onClick={() => void update.mutateAsync({ timezone })}
      >
        {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Сохранить
      </Button>
    </div>
  )
}
