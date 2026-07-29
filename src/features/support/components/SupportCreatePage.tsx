import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LabeledSelect } from '@/components/ui/labeled-select'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/lib/apiError'
import { filenameFromUploadUrl } from '../api'
import { useCreateSupportTicket } from '../hooks'
import {
  supportCategoryOptions,
  supportPriorityOptions,
} from '../labels'
import type { SupportCategory, SupportPriority } from '../types'

const schema = z.object({
  category: z.enum(['bug', 'access', 'data', 'how_to', 'suggestion', 'other']),
  priority: z.enum(['normal', 'high']),
  subject: z.string().trim().min(3, 'Тема минимум 3 символа').max(200),
  body: z.string().trim().min(10, 'Опишите подробнее (от 10 символов)').max(5000),
})

type FormValues = z.infer<typeof schema>

const CATEGORY_OPTIONS = supportCategoryOptions()
const PRIORITY_OPTIONS = supportPriorityOptions()

export function SupportCreatePage() {
  const navigate = useNavigate()
  const create = useCreateSupportTicket()
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'bug', priority: 'normal', subject: '', body: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const ticket = await create.mutateAsync({
        category: values.category as SupportCategory,
        priority: values.priority as SupportPriority,
        subject: values.subject,
        body: values.body,
        attachments: attachmentUrls.map((fileUrl) => ({
          fileUrl,
          filename: filenameFromUploadUrl(fileUrl),
        })),
      })
      toast.success('Обращение принято. Статус: Новый')
      await navigate({ to: '/support/$ticketId', params: { ticketId: ticket.id } })
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Не удалось создать обращение'))
    }
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Новое обращение</h1>
        <p className="text-sm text-muted-foreground">
          Коротко сформулируйте тему. В описании укажите раздел, шаги и что ожидали увидеть.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <LabeledSelect
          label="Категория"
          value={form.watch('category')}
          options={CATEGORY_OPTIONS}
          onValueChange={(v) => {
            if (v) form.setValue('category', v as FormValues['category'])
          }}
        />

        <div className="space-y-1">
          <LabeledSelect
            label="Приоритет"
            value={form.watch('priority')}
            options={PRIORITY_OPTIONS}
            onValueChange={(v) => {
              if (v) form.setValue('priority', v as FormValues['priority'])
            }}
          />
          <p className="text-xs text-muted-foreground">
            «Высокий» — когда система мешает работать прямо сейчас.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Тема</Label>
          <Input
            id="subject"
            placeholder="Например: Не открывается карта полей"
            {...form.register('subject')}
          />
          {form.formState.errors.subject ? (
            <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Описание</Label>
          <Textarea
            id="body"
            rows={6}
            placeholder="Что произошло, в каком разделе, что уже пробовали сделать"
            {...form.register('body')}
          />
          {form.formState.errors.body ? (
            <p className="text-sm text-destructive">{form.formState.errors.body.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Скриншоты (необязательно)</Label>
          <ImageUploader
            value={attachmentUrls}
            onChange={setAttachmentUrls}
            folder="support"
            maxFiles={3}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void navigate({ to: '/support' })}
          >
            Отмена
          </Button>
          <Button type="submit" className="min-h-11" disabled={create.isPending}>
            {create.isPending ? 'Отправка…' : 'Отправить'}
          </Button>
        </div>
      </form>
    </div>
  )
}
