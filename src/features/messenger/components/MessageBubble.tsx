import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage, MessageDeliveryStatus } from '../types'
import { formatMessageTime } from '../utils'

interface MessageBubbleProps {
  message: ChatMessage
  mine: boolean
}

function resolveDeliveryStatus(message: ChatMessage): MessageDeliveryStatus {
  if (message.pending) return 'pending'
  if (message.deliveryStatus === 'read') return 'read'
  if (message.deliveryStatus === 'pending') return 'pending'
  return 'delivered'
}

export function MessageDeliveryTicks({
  status,
  className,
}: {
  status: MessageDeliveryStatus
  className?: string
}) {
  if (status === 'pending') {
    return (
      <span
        className={cn('inline-flex text-muted-foreground', className)}
        data-testid="delivery-ticks"
        data-status="pending"
        aria-label="Отправляется"
      >
        ···
      </span>
    )
  }

  if (status === 'read') {
    return (
      <CheckCheck
        className={cn('inline size-3.5 text-primary', className)}
        data-testid="delivery-ticks"
        data-status="read"
        aria-label="Прочитано"
      />
    )
  }

  return (
    <Check
      className={cn('inline size-3.5 text-muted-foreground', className)}
      data-testid="delivery-ticks"
      data-status="delivered"
      aria-label="Доставлено"
    />
  )
}

export function MessageBubble({ message, mine }: MessageBubbleProps) {
  const status = resolveDeliveryStatus(message)

  return (
    <div
      className={cn(
        'max-w-[85%] rounded-lg border border-border px-3 py-2 sm:max-w-[70%]',
        mine ? 'ml-auto bg-primary/10' : 'mr-auto bg-surface',
        message.pending && 'opacity-70',
      )}
    >
      {!mine ? (
        <p className="mb-1 truncate text-xs font-medium text-foreground">
          {message.senderName}
        </p>
      ) : null}
      <p className="break-words whitespace-pre-wrap text-sm text-foreground [overflow-wrap:anywhere]">
        {message.deletedAt ? 'Сообщение удалено' : message.body}
      </p>
      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <time>{formatMessageTime(message.createdAt)}</time>
        {mine ? <MessageDeliveryTicks status={status} /> : null}
      </div>
    </div>
  )
}
