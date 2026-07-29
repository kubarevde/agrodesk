import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { SupportMessage } from '../types'

interface SupportMessageThreadProps {
  messages: SupportMessage[]
  /** Whose bubble is "ours" on the right */
  perspective: 'user' | 'staff'
}

export function SupportMessageThread({ messages, perspective }: SupportMessageThreadProps) {
  return (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isSupport = msg.authorType === 'superadmin'
        const isMine = perspective === 'user' ? !isSupport : isSupport
        const title = isSupport
          ? perspective === 'staff'
            ? `Поддержка · ${msg.authorName}`
            : 'Техподдержка'
          : msg.authorName

        return (
          <div
            key={msg.id}
            className={cn(
              'rounded-lg border border-border p-3 sm:p-4',
              isSupport ? 'bg-primary/5' : 'bg-surface',
              isMine && 'sm:ml-6',
              !isMine && 'sm:mr-6',
            )}
          >
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <time className="text-xs text-muted-foreground">
                {format(new Date(msg.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
              </time>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{msg.body}</p>
            {msg.attachments.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {msg.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={mediaUrl(att.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded-md border border-border"
                  >
                    <img
                      src={mediaUrl(att.fileUrl)}
                      alt={att.filename}
                      className="aspect-square w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
