import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageComposerProps {
  disabled?: boolean
  sending?: boolean
  onSend: (body: string) => void
}

export function MessageComposer({ disabled, sending, onSend }: MessageComposerProps) {
  const [text, setText] = useState('')

  function submit() {
    const body = text.trim()
    if (!body || disabled || sending) return
    onSend(body)
    setText('')
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        rows={1}
        placeholder="Сообщение…"
        disabled={disabled || sending}
        className="min-h-11 max-h-32 flex-1 resize-y rounded-md border border-input bg-background px-3 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
        data-testid="message-input"
      />
      <Button
        type="submit"
        size="icon"
        className="size-11 shrink-0"
        disabled={disabled || sending || !text.trim()}
        aria-label="Отправить"
        data-testid="send-message"
      >
        <Send className="size-4" />
      </Button>
    </form>
  )
}
