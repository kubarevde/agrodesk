import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { SupportMessageThread } from '@/features/support/components/SupportMessageThread'
import { SupportReplyForm } from '@/features/support/components/SupportReplyForm'
import {
  categoryLabel,
  priorityBadgeClass,
  priorityLabel,
  roleLabel,
  statusBadgeClass,
  statusLabel,
  supportPriorityOptions,
  supportStatusOptions,
} from '@/features/support/labels'
import { apiErrorMessage } from '@/lib/apiError'
import {
  useSuperadminSupportReply,
  useSuperadminSupportTemplates,
  useSuperadminSupportTicket,
  useSuperadminSupportUpdate,
} from '../hooks/useSupport'

const STATUS_OPTIONS = supportStatusOptions('staff')
const PRIORITY_OPTIONS = supportPriorityOptions()

interface SupportTicketDetailPageProps {
  ticketId: string
}

export function SupportTicketDetailPage({ ticketId }: SupportTicketDetailPageProps) {
  const navigate = useNavigate()
  const { data: ticket, isLoading } = useSuperadminSupportTicket(ticketId)
  const { data: templates = [] } = useSuperadminSupportTemplates()
  const reply = useSuperadminSupportReply(ticketId)
  const update = useSuperadminSupportUpdate(ticketId)

  if (isLoading || !ticket) return <PageSkeleton />

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 min-h-11"
        onClick={() => void navigate({ to: '/superadmin/support' })}
      >
        <ArrowLeft className="size-4" />
        К списку
      </Button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={statusBadgeClass(ticket.status)}>
            {statusLabel(ticket.status, 'staff')}
          </Badge>
          <Badge className={priorityBadgeClass(ticket.priority)}>
            {priorityLabel(ticket.priority)}
          </Badge>
          {ticket.unreadForStaff ? <Badge>Новое сообщение</Badge> : null}
        </div>
        <h1 className="text-xl font-semibold sm:text-2xl">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">
          {ticket.orgName} · {ticket.authorName} ({roleLabel(ticket.authorRole)}) ·{' '}
          {categoryLabel(ticket.category)} ·{' '}
          {format(new Date(ticket.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
        </p>
        <p className="text-sm text-muted-foreground">
          Ответственный: {ticket.assigneeEmail ?? 'не назначен'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSelect
          label="Статус"
          value={ticket.status}
          options={STATUS_OPTIONS}
          onValueChange={(v) => {
            if (!v) return
            void update
              .mutateAsync({ status: v })
              .then(() => toast.success(`Статус: ${statusLabel(v, 'staff')}`))
              .catch((err) => toast.error(apiErrorMessage(err, 'Не удалось сменить статус')))
          }}
        />
        <LabeledSelect
          label="Приоритет"
          value={ticket.priority}
          options={PRIORITY_OPTIONS}
          onValueChange={(v) => {
            if (!v) return
            void update
              .mutateAsync({ priority: v })
              .then(() => toast.success(`Приоритет: ${priorityLabel(v)}`))
              .catch((err) =>
                toast.error(apiErrorMessage(err, 'Не удалось сменить приоритет')),
              )
          }}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        disabled={update.isPending}
        onClick={() => {
          void update
            .mutateAsync({ assignToMe: true })
            .then(() => toast.success('Назначено на вас'))
            .catch((err) => toast.error(apiErrorMessage(err, 'Не удалось назначить')))
        }}
      >
        Назначить на меня
      </Button>

      <SupportMessageThread messages={ticket.messages ?? []} perspective="staff" />

      {ticket.status !== 'closed' ? (
        <SupportReplyForm
          pending={reply.isPending}
          placeholder="Ответ пользователю…"
          submitLabel="Ответить"
          templates={templates}
          onSubmit={async ({ body, attachments }) => {
            try {
              await reply.mutateAsync({ body, attachments })
              toast.success('Ответ отправлен пользователю')
            } catch (err) {
              toast.error(apiErrorMessage(err, 'Не удалось отправить ответ'))
            }
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Обращение закрыто.</p>
      )}
    </div>
  )
}
