import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMessengerPeers } from '../hooks'

interface NewDirectChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
  onSubmit: (peerId: string) => Promise<void>
}

export function NewDirectChatDialog({
  open,
  onOpenChange,
  currentUserId,
  onSubmit,
}: NewDirectChatDialogProps) {
  const { data: peersRaw = [], isLoading } = useMessengerPeers(open)
  const [peerId, setPeerId] = useState('')
  const [saving, setSaving] = useState(false)

  const peers = useMemo(
    () => peersRaw.filter((e) => e.id !== currentUserId),
    [peersRaw, currentUserId],
  )

  async function handleSubmit() {
    if (!peerId) return
    setSaving(true)
    try {
      await onSubmit(peerId)
      setPeerId('')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Загрузка сотрудников…</p>
        ) : peers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет доступных коллег</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {peers.map((emp) => (
              <li key={emp.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="peer"
                    className="size-4 accent-primary"
                    checked={peerId === emp.id}
                    onChange={() => setPeerId(emp.id)}
                  />
                  <span className="min-w-0 truncate">
                    {emp.fullName}
                    {emp.employeeCode ? (
                      <span className="text-muted-foreground"> ({emp.employeeCode})</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" disabled={!peerId || saving} onClick={() => void handleSubmit()}>
            Написать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
