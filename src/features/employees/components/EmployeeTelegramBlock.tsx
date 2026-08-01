import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
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

  async function bind(forceTransfer = false) {
    const telegramIdNum = Number(value)
    if (!Number.isFinite(telegramIdNum) || telegramIdNum <= 0) return
    try {
      await linkTelegram.mutateAsync({
        employeeId,
        telegramId: telegramIdNum,
        forceTransfer,
      })
    } catch (error) {
      if (
        !forceTransfer &&
        isAxiosError(error) &&
        error.response?.status === 409
      ) {
        const ok = window.confirm(
          `${String(error.response.data?.detail || 'Telegram ID уже занят.')}\n\n` +
            'Перенести привязку на этого сотрудника? Старый сотрудник потеряет доступ к боту.',
        )
        if (ok) {
          await linkTelegram.mutateAsync({
            employeeId,
            telegramId: telegramIdNum,
            forceTransfer: true,
          })
        }
      }
    }
  }

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
      <div className="flex flex-wrap gap-2">
        <Input
          id="telegram-id"
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="123456789"
          className="min-w-[10rem] flex-1"
        />
        <Button
          type="button"
          disabled={!value.trim() || linkTelegram.isPending}
          onClick={() => void bind(false)}
        >
          Привязать
        </Button>
        {linked ? (
          <Button
            type="button"
            variant="outline"
            disabled={linkTelegram.isPending}
            onClick={() =>
              void linkTelegram.mutateAsync({
                employeeId,
                telegramId: null,
              })
            }
          >
            Отвязать
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Один Telegram ID — один сотрудник. При переносе старая привязка
        снимается после подтверждения.
      </p>
    </div>
  )
}
