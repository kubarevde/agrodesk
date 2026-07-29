import { useState } from 'react'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Button } from '@/components/ui/button'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import { filenameFromUploadUrl } from '../api'
import type { SupportAttachmentInput } from '../types'

export type SupportReplySubmit = {
  body: string
  attachments: SupportAttachmentInput[]
}

interface SupportReplyFormProps {
  disabled?: boolean
  pending?: boolean
  placeholder?: string
  submitLabel?: string
  allowAttachments?: boolean
  templates?: { id: string; title: string; body: string }[]
  onSubmit: (payload: SupportReplySubmit) => Promise<void> | void
}

export function SupportReplyForm({
  disabled,
  pending,
  placeholder = 'Ваш ответ…',
  submitLabel = 'Отправить ответ',
  allowAttachments = true,
  templates,
  onSubmit,
}: SupportReplyFormProps) {
  const [body, setBody] = useState('')
  const [urls, setUrls] = useState<string[]>([])

  const send = async () => {
    const text = body.trim()
    if (!text || disabled || pending) return
    await onSubmit({
      body: text,
      attachments: urls.map((fileUrl) => ({
        fileUrl,
        filename: filenameFromUploadUrl(fileUrl),
      })),
    })
    setBody('')
    setUrls([])
  }

  return (
    <div className="sticky bottom-0 space-y-3 border-t border-border bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {templates && templates.length > 0 ? (
        <LabeledSelect
          label="Шаблон ответа"
          value=""
          placeholder="Вставить шаблон…"
          options={templates.map((t) => ({ value: t.id, label: t.title }))}
          onValueChange={(id) => {
            const tpl = templates.find((t) => t.id === id)
            if (tpl) setBody(tpl.body)
          }}
        />
      ) : null}
      <Textarea
        rows={3}
        placeholder={placeholder}
        value={body}
        disabled={disabled || pending}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-20"
      />
      {allowAttachments ? (
        <ImageUploader value={urls} onChange={setUrls} folder="support" maxFiles={3} />
      ) : null}
      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        onClick={() => void send()}
        disabled={disabled || pending || !body.trim()}
      >
        {pending ? 'Отправка…' : submitLabel}
      </Button>
    </div>
  )
}
