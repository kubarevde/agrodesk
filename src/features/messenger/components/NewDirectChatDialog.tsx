import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useExternalOrgAdmins, useMessengerPeers } from '../hooks'
import { ExternalOrgsPicker } from './ExternalOrgsPicker'

type PeerSource = 'colleagues' | 'other-orgs'

interface NewDirectChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
  isAdmin: boolean
  onSubmit: (peerId: string, options?: { crossOrg?: boolean }) => Promise<void>
}

export function NewDirectChatDialog({
  open,
  onOpenChange,
  currentUserId,
  isAdmin,
  onSubmit,
}: NewDirectChatDialogProps) {
  const [source, setSource] = useState<PeerSource>('colleagues')
  const { data: peersRaw = [], isLoading } = useMessengerPeers(open && source === 'colleagues')
  const [peerId, setPeerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [orgQuery, setOrgQuery] = useState('')
  const [region, setRegion] = useState<string | null>(null)

  const externalEnabled = open && isAdmin && source === 'other-orgs'
  const {
    data: externalAdmins = [],
    isLoading: externalLoading,
    isError: externalError,
  } = useExternalOrgAdmins({ q: orgQuery, region }, externalEnabled)

  const peers = useMemo(
    () => peersRaw.filter((e) => e.id !== currentUserId),
    [peersRaw, currentUserId],
  )

  function resetAndClose(nextOpen: boolean) {
    if (!nextOpen) {
      setPeerId('')
      setOrgQuery('')
      setRegion(null)
      setSource('colleagues')
    }
    onOpenChange(nextOpen)
  }

  async function handleSubmit() {
    if (!peerId) return
    setSaving(true)
    try {
      await onSubmit(peerId, { crossOrg: source === 'other-orgs' })
      setPeerId('')
      resetAndClose(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать чат</DialogTitle>
        </DialogHeader>

        {isAdmin ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={source === 'colleagues' ? 'default' : 'outline'}
              className="min-h-11"
              onClick={() => {
                setSource('colleagues')
                setPeerId('')
              }}
            >
              Коллеги
            </Button>
            <Button
              type="button"
              variant={source === 'other-orgs' ? 'default' : 'outline'}
              className="min-h-11"
              onClick={() => {
                setSource('other-orgs')
                setPeerId('')
              }}
              data-testid="cross-org-chat-tab"
            >
              Другие хозяйства
            </Button>
          </div>
        ) : null}

        {source === 'colleagues' ? (
          isLoading ? (
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
          )
        ) : (
          <ExternalOrgsPicker
            orgQuery={orgQuery}
            onOrgQueryChange={setOrgQuery}
            region={region}
            onRegionChange={setRegion}
            peerId={peerId}
            onPeerIdChange={setPeerId}
            rows={externalAdmins}
            loading={externalLoading}
            isError={externalError}
          />
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-10"
            onClick={() => resetAndClose(false)}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-10"
            disabled={!peerId || saving}
            onClick={() => void handleSubmit()}
          >
            Написать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
