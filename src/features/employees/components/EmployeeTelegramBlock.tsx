import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLinkTelegram } from '@/features/employees/salaryHooks'

interface EmployeeTelegramBlockProps {
  employeeId: string
  telegramId: string
}

export function EmployeeTelegramBlock({
  employeeId,
  telegramId,
}: EmployeeTelegramBlockProps) {
  const linkTelegram = useLinkTelegram()
  const [value, setValue] = useState(telegramId)
  const linked = Boolean(telegramId.trim())

  useEffect(() => {
    setValue(telegramId)
  }, [telegramId])

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="telegram-id">Telegram ID</Label>
        <Badge
          variant="outline"
          className={
            linked
              ? 'border-success/40 bg-success/10 text-success'
              : 'text-muted-foreground'
          }
        >
          {linked ? 'TG ✓' : 'TG —'}
        </Badge>
      </div>
      <div className="flex gap-2">
        <Input
          id="telegram-id"
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="123456789"
        />
        <Button
          type="button"
          disabled={!value.trim() || linkTelegram.isPending}
          onClick={() =>
            void linkTelegram.mutateAsync({
              employeeId,
              telegramId: Number(value),
            })
          }
        >
          Привязать
        </Button>
      </div>
    </div>
  )
}
