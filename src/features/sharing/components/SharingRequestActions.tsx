import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SharingRequest } from '../types'
import { REQUEST_STATUS_LABELS } from '../types'
import { formatRequestDates } from '../utils'
import { useUpdateSharingRequest } from '../hooks'

type SharingRequestActionsProps = {
  request: SharingRequest
}

export function SharingRequestActions({ request }: SharingRequestActionsProps) {
  const [response, setResponse] = useState('')
  const updateRequest = useUpdateSharingRequest()

  if (request.status !== 'pending') return null

  const pending = updateRequest.isPending

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Input
        placeholder="Ответ владельца (необязательно)"
        value={response}
        onChange={(event) => setResponse(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            updateRequest.mutate({
              id: request.id,
              status: 'accepted',
              ownerResponse: response || undefined,
            })
          }
        >
          Принять
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            updateRequest.mutate({
              id: request.id,
              status: 'rejected',
              ownerResponse: response || undefined,
            })
          }
        >
          Отклонить
        </Button>
      </div>
    </div>
  )
}

type SharingRequestRowProps = {
  request: SharingRequest
  showActions?: boolean
}

export function SharingRequestRow({ request, showActions }: SharingRequestRowProps) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">{request.requesterName}</p>
        <Badge variant="secondary">{REQUEST_STATUS_LABELS[request.status]}</Badge>
      </div>
      <p className="text-muted-foreground">
        Даты: {formatRequestDates(request.desiredFrom, request.desiredTo)}
      </p>
      {request.message ? <p className="text-foreground">{request.message}</p> : null}
      {request.ownerResponse ? (
        <p className="text-muted-foreground">Ответ: {request.ownerResponse}</p>
      ) : null}
      {showActions ? <SharingRequestActions request={request} /> : null}
    </div>
  )
}
