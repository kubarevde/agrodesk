import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  useCreateSellerListing,
  useMarketCategories,
  useSubmitSellerListing,
  useUpdateSellerListing,
} from '../hooks'
import { isListingFormReady, listingRejectionVisible } from '../labels'
import type { SellerListing } from '../types'
import { RejectionBanner } from './ListingStatusBadge'
import {
  ListingFormFields,
  listingFormPayload,
  listingFormSchema,
  type ListingFormValues,
} from './ListingFormFields'

export function SellerListingForm({
  mode,
  listing,
}: {
  mode: 'create' | 'edit'
  listing?: SellerListing
}) {
  const navigate = useNavigate()
  const categories = useMarketCategories()
  const createMut = useCreateSellerListing()
  const updateMut = useUpdateSellerListing()
  const submitMut = useSubmitSellerListing()

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      unit: 'кг',
      quantity_available: 0,
      category_id: '',
      photos: [],
    },
  })

  useEffect(() => {
    if (!listing) return
    form.reset({
      title: listing.title,
      description: listing.description ?? '',
      price: Number(listing.price),
      unit: listing.unit,
      quantity_available: Number(listing.quantity_available),
      category_id: listing.category_id ?? '',
      photos: listing.photos ?? [],
    })
  }, [listing, form])

  const canSubmitReview =
    mode === 'create' || (listing != null && ['draft', 'rejected'].includes(listing.status))

  const saveDraft = form.handleSubmit(async (values) => {
    const payload = listingFormPayload(values)
    if (mode === 'create') {
      const row = await createMut.mutateAsync(payload)
      void navigate({
        to: '/seller-market/listings/$listingId',
        params: { listingId: row.id },
      })
      return
    }
    if (!listing) return
    await updateMut.mutateAsync({ id: listing.id, payload })
  })

  const submitReview = form.handleSubmit(async (values) => {
    const readyErrors = isListingFormReady({
      title: values.title,
      price: values.price,
      quantity_available: values.quantity_available,
      category_id: values.category_id ?? '',
      photos: values.photos,
    })
    if (readyErrors.length) {
      form.setError('root', { message: readyErrors.join('; ') })
      return
    }
    form.clearErrors('root')
    const payload = listingFormPayload(values)
    if (mode === 'create') {
      const row = await createMut.mutateAsync(payload)
      await submitMut.mutateAsync(row.id)
      void navigate({
        to: '/seller-market/listings/$listingId',
        params: { listingId: row.id },
      })
      return
    }
    if (!listing) return
    await updateMut.mutateAsync({ id: listing.id, payload })
    await submitMut.mutateAsync(listing.id)
  })

  const busy = createMut.isPending || updateMut.isPending || submitMut.isPending
  const rejection = listing ? listingRejectionVisible(listing) : null

  return (
    <form onSubmit={saveDraft} className="mx-auto max-w-xl space-y-4" data-testid="listing-form">
      {rejection ? <RejectionBanner reason={rejection} /> : null}
      <ListingFormFields form={form} categories={categories.data ?? []} />
      {form.formState.errors.root ? (
        <p className="text-sm text-destructive" data-testid="listing-form-errors">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground hover:bg-primary-hover"
        >
          Сохранить
        </Button>
        {canSubmitReview ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void submitReview()}>
            Отправить на модерацию
          </Button>
        ) : null}
      </div>
    </form>
  )
}
