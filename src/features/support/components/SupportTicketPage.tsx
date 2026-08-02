import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { apiErrorMessage } from '@/lib/apiError'
import { useReplySupportTicket, useSupportTicket } from '../hooks'
import {
  categoryLabel,
  priorityBadgeClass,
  priorityLabel,
  statusBadgeClass,
  statusLabel,
} from '../labels'
import { SupportMessageThread } from './SupportMessageThread'
import { SupportReplyForm } from './SupportReplyForm'

interface SupportTicketPageProps {
  ticketId: string
}

export function SupportTicketPage({ ticketId }: SupportTicketPageProps) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: ticket, isLoading, isError, error } = useSupportTicket(ticketId)
  const reply = useReplySupportTicket(ticketId)

  if (isLoading) return <PageSkeleton />

  if (isError || !ticket) {
    const status = (error as { response?: { status?: number } })?.response?.status
    const forbidden = status === 403
    return (
      <EmptyState
        icon={ShieldAlert}
        title={forbidden ? 'Нет доступа к обращению' : 'Обращение не найдено'}
        description={
          forbidden
            ? 'Нет прав на просмотр этого обращения.'
            : 'Возможно, ссылка устарела или обращение удалено.'
        }
        action={{
          label: 'К списку обращений',
          onClick: () => void navigate({ to: '/support' }),
        }}
      />
    )
  }

  const isAuthor = user?.id === ticket.authorId
  const canReply = isAuthor && ticket.status !== 'closed'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-4">
      <div className="space-y-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 min-h-11"
          onClick={() => void navigate({ to: '/support' })}
        >
          <ArrowLeft className="size-4" />
          К списку
        </Button>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={statusBadgeClass(ticket.status)}>
              {statusLabel(ticket.status, 'user')}
            </Badge>
            <Badge className={priorityBadgeClass(ticket.priority)}>
              {priorityLabel(ticket.priority)}
            </Badge>
            {ticket.unreadForUser ? <Badge>Новый ответ поддержки</Badge> : null}
          </div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {categoryLabel(ticket.category)} · создано{' '}
            {format(new Date(ticket.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
            {!isAuthor ? ` · ${ticket.authorName}` : ''}
          </p>
        </div>
      </div>

      <SupportMessageThread messages={ticket.messages ?? []} perspective="user" />

      {isAuthor && ticket.status === 'waiting_user' ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-foreground">
          Поддержка ждёт ваш ответ. Напишите ниже в переписке — статус обновится после сообщения.
        </div>
      ) : null}

      {ticket.unreadForUser && isAuthor && ticket.status !== 'waiting_user' ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm text-foreground">
          Есть новый ответ поддержки. Прочитайте переписку ниже.
        </div>
      ) : null}

      {canReply ? (
        <SupportReplyForm
          pending={reply.isPending}
          onSubmit={async ({ body, attachments }) => {
            try {
              await reply.mutateAsync({ body, attachments })
              toast.success('Сообщение отправлено')
            } catch (err) {
              toast.error(apiErrorMessage(err, 'Не удалось отправить сообщение'))
            }
          }}
        />
      ) : ticket.status === 'closed' ? (
        <p className="text-sm text-muted-foreground">
          Обращение закрыто. Создайте новое, если вопрос снова актуален.
        </p>
      ) : !isAuthor ? (
        <p className="text-sm text-muted-foreground">
          Просмотр обращения коллеги. Отвечать может только автор.
        </p>
      ) : null}
    </div>
  )
}
