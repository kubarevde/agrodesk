import { Inbox } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  useIncomingSharingRequests,
  useOutgoingSharingRequests,
} from '../hooks'
import { REQUEST_STATUS_LABELS, TYPE_LABELS, type SharingListingType } from '../types'
import { formatRequestDates } from '../utils'
import { SharingRequestActions } from './SharingRequestActions'

export function SharingMyRequestsTab() {
  const { data: incoming = [], isLoading: incomingLoading } = useIncomingSharingRequests()
  const { data: outgoing = [], isLoading: outgoingLoading } = useOutgoingSharingRequests()

  if (incomingLoading || outgoingLoading) return <PageSkeleton />

  const empty = incoming.length === 0 && outgoing.length === 0

  if (empty) {
    return (
      <EmptyState
        icon={Inbox}
        title="Заявок пока нет"
        description="Оставьте заявку на чужое объявление или дождитесь откликов на своё"
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Входящие</h2>
        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Входящих заявок нет</p>
        ) : (
          incoming.map((request) => (
            <Card key={request.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">
                    {TYPE_LABELS[request.listingType as SharingListingType] ??
                      request.listingType}
                  </Badge>
                  <Badge variant="secondary">{REQUEST_STATUS_LABELS[request.status]}</Badge>
                </div>
                <p className="font-medium text-foreground">На объявление: {request.listingTitle}</p>
                <p className="text-sm text-foreground">Заявитель: {request.requesterName}</p>
                <p className="text-sm text-muted-foreground">
                  Даты: {formatRequestDates(request.desiredFrom, request.desiredTo)}
                </p>
                {request.message ? (
                  <p className="text-sm text-foreground">{request.message}</p>
                ) : null}
                <SharingRequestActions request={request} />
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Исходящие</h2>
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted-foreground">Исходящих заявок нет</p>
        ) : (
          outgoing.map((request) => {
            const typeLabel =
              TYPE_LABELS[request.listingType as SharingListingType] ?? request.listingType
            return (
              <Card key={request.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{typeLabel}</Badge>
                    <Badge variant="secondary">{REQUEST_STATUS_LABELS[request.status]}</Badge>
                  </div>
                  <p className="font-medium text-foreground">
                    На объявление: {request.listingTitle}
                  </p>
                  {request.listingOwnerName ? (
                    <p className="text-sm text-muted-foreground">
                      Владелец: {request.listingOwnerName}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Мои даты: {formatRequestDates(request.desiredFrom, request.desiredTo)}
                  </p>
                  {request.message ? (
                    <p className="text-sm text-foreground">Моё сообщение: {request.message}</p>
                  ) : null}
                  {request.ownerResponse ? (
                    <p className="text-sm text-foreground">Ответ: {request.ownerResponse}</p>
                  ) : null}
                  {request.status === 'accepted' ? (
                    <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
                      {request.listingContactInfo
                        ? `Контакты владельца: ${request.listingContactInfo}`
                        : 'Заявка принята. Контакт не указан владельцем.'}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })
        )}
      </section>
    </div>
  )
}
