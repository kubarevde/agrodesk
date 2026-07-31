import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMessengerPeers } from '../hooks'

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

interface NewGroupChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
  onSubmit: (payload: { name: string; memberIds: string[] }) => Promise<void>
}

export function NewGroupChatDialog({
  open,
  onOpenChange,
  currentUserId,
  onSubmit,
}: NewGroupChatDialogProps) {
  const { data: peersRaw = [], isLoading } = useMessengerPeers(open)
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const peers = useMemo(
    () => peersRaw.filter((e) => e.id !== currentUserId),
    [peersRaw, currentUserId],
  )

  async function handleSubmit() {
    const title = name.trim()
    if (!title) return
    setSaving(true)
    try {
      await onSubmit({ name: title, memberIds })
      setName('')
      setMemberIds([])
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая группа</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название группы"
            data-testid="group-name-input"
          />
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка сотрудников…</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {peers.map((emp) => (
                <li key={emp.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={memberIds.includes(emp.id)}
                      onChange={() => setMemberIds((ids) => toggleInList(ids, emp.id))}
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
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => void handleSubmit()}
            data-testid="create-group-submit"
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
