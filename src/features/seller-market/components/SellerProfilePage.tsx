import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { useSellerProfile, useUpdateSellerProfile } from '../hooks'
import { SellerMarketShell } from './SellerMarketShell'

const schema = z.object({
  display_name: z.string().trim().min(1, 'Укажите название').max(200),
  description: z.string().max(5000).optional(),
  phone: z.string().max(40).optional(),
  logo_url: z.string().nullable().optional(),
})

type FormValues = z.infer<typeof schema>

export function SellerProfilePage() {
  const profile = useSellerProfile()
  const update = useUpdateSellerProfile()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: '',
      description: '',
      phone: '',
      logo_url: null,
    },
  })

  useEffect(() => {
    if (!profile.data) return
    form.reset({
      display_name: profile.data.display_name,
      description: profile.data.description ?? '',
      phone: profile.data.phone ?? '',
      logo_url: profile.data.logo_url,
    })
  }, [profile.data, form])

  const logo = form.watch('logo_url')

  if (profile.isLoading) {
    return (
      <SellerMarketShell>
        <Skeleton className="h-64 w-full max-w-xl" />
      </SellerMarketShell>
    )
  }

  if (profile.isError || !profile.data) {
    return (
      <SellerMarketShell>
        <EmptyState
          icon={Store}
          title="Профиль недоступен"
          description="Витрина не включена для организации или нет права marketplace.manage."
        />
      </SellerMarketShell>
    )
  }

  return (
    <SellerMarketShell>
      <form
        className="mx-auto max-w-xl space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          await update.mutateAsync({
            display_name: values.display_name,
            description: values.description || null,
            phone: values.phone || null,
            logo_url: values.logo_url || null,
          })
        })}
      >
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Включение витрины для организации делается на стороне платформы. Здесь настраивается
          только публичный профиль продавца.
        </p>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="display_name">
            Название магазина
          </label>
          <input
            id="display_name"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            {...form.register('display_name')}
          />
          {form.formState.errors.display_name ? (
            <p className="mt-1 text-xs text-destructive">
              {form.formState.errors.display_name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="phone">
            Телефон
          </label>
          <input
            id="phone"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            {...form.register('phone')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="description">
            Описание
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...form.register('description')}
          />
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Логотип</p>
          <ImageUploader
            folder="marketplace"
            value={logo ? [logo] : []}
            onChange={(urls) =>
              form.setValue('logo_url', urls[0] ?? null, { shouldDirty: true })
            }
            maxFiles={1}
          />
        </div>

        <Button
          type="submit"
          disabled={update.isPending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          Сохранить профиль
        </Button>
      </form>
    </SellerMarketShell>
  )
}
