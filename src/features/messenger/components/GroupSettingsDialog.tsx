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
import type { ChatListItem } from '../types'

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

interface GroupSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chat: ChatListItem
  currentUserId: string
  onSave: (payload: {
    name?: string
    addMemberIds?: string[]
    removeMemberIds?: string[]
  }) => Promise<void>
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  chat,
  currentUserId,
  onSave,
}: GroupSettingsDialogProps) {
  const { data: peersRaw = [] } = useMessengerPeers(open)
  const [name, setName] = useState(chat.name ?? chat.title)
  const [selected, setSelected] = useState<string[]>(() =>
    chat.members.filter((m) => m.employeeId !== currentUserId).map((m) => m.employeeId),
  )
  const [saving, setSaving] = useState(false)

  const peers = useMemo(
    () => peersRaw.filter((e) => e.id !== currentUserId),
    [peersRaw, currentUserId],
  )

  const activeIds = new Set(
    chat.members.filter((m) => m.employeeId !== currentUserId).map((m) => m.employeeId),
  )

  async function handleSave() {
    const addMemberIds = selected.filter((id) => !activeIds.has(id))
    const removeMemberIds = [...activeIds].filter((id) => !selected.includes(id))
    const nextName = name.trim()
    const nameChanged = nextName && nextName !== (chat.name ?? chat.title)

    setSaving(true)
    try {
      await onSave({
        name: nameChanged ? nextName : undefined,
        addMemberIds,
        removeMemberIds,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(chat.name ?? chat.title)
          setSelected(
            chat.members
              .filter((m) => m.employeeId !== currentUserId)
              .map((m) => m.employeeId),
          )
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Настройки группы</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            data-testid="group-settings-name"
          />
          <ul className="max-h-56 space-y-1 overflow-y-auto">
            {peers.map((emp) => (
              <li key={emp.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={selected.includes(emp.id)}
                    onChange={() => setSelected((ids) => toggleInList(ids, emp.id))}
                  />
                  <span className="min-w-0 truncate">{emp.fullName}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" disabled={!name.trim() || saving} onClick={() => void handleSave()}>
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
