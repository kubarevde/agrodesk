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
import {
  isListingFormReady,
  isSourceLinkedListing,
  listingCanSubmitForReview,
  listingRejectionVisible,
  listingSourceLinkLabel,
  LISTING_STATUS_HINTS,
} from '../labels'
import type { SellerListing } from '../types'
import { ListingStatusBadge, RejectionBanner } from './ListingStatusBadge'
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
  const quantityLinked = listing ? isSourceLinkedListing(listing) : false

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
    mode === 'create' || listingCanSubmitForReview(listing?.status)

  const saveDraft = form.handleSubmit(async (values) => {
    if (mode === 'create') {
      const payload = listingFormPayload(values)
      const row = await createMut.mutateAsync({
        ...payload,
        quantity_available: values.quantity_available,
      })
      void navigate({
        to: '/seller-market/listings/$listingId',
        params: { listingId: row.id },
      })
      return
    }
    if (!listing) return
    const payload = listingFormPayload(values, { omitQuantity: quantityLinked })
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
    if (mode === 'create') {
      const payload = listingFormPayload(values)
      const row = await createMut.mutateAsync({
        ...payload,
        quantity_available: values.quantity_available,
      })
      await submitMut.mutateAsync(row.id)
      void navigate({
        to: '/seller-market/listings/$listingId',
        params: { listingId: row.id },
      })
      return
    }
    if (!listing) return
    const payload = listingFormPayload(values, { omitQuantity: quantityLinked })
    await updateMut.mutateAsync({ id: listing.id, payload })
    await submitMut.mutateAsync(listing.id)
  })

  const busy = createMut.isPending || updateMut.isPending || submitMut.isPending
  const rejection = listing ? listingRejectionVisible(listing) : null
  const sourceLabel = listingSourceLinkLabel(listing?.source_type)
  const submitLabel =
    listing?.status === 'rejected' ? 'Исправить и отправить на модерацию' : 'Отправить на модерацию'

  return (
    <form onSubmit={saveDraft} className="mx-auto max-w-xl space-y-4" data-testid="listing-form">
      {listing ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <ListingStatusBadge status={listing.status} />
            <span className="text-xs text-muted-foreground">{LISTING_STATUS_HINTS[listing.status]}</span>
          </div>
          {sourceLabel ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {sourceLabel}. Карточка объявления и модерация отдельные; заявка со витрины склад не
              списывает.
              {listing.source_missing
                ? ' Источник остатка сейчас недоступен — доступное количество 0.'
                : null}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Сохраните черновик или сразу отправьте на модерацию. На витрину попадёт только после
          одобрения.
        </p>
      )}

      {rejection ? <RejectionBanner reason={rejection} showFixHint /> : null}

      <ListingFormFields
        form={form}
        categories={categories.data ?? []}
        quantityLinked={quantityLinked}
        sourceMissing={Boolean(listing?.source_missing)}
      />

      {form.formState.errors.root ? (
        <p className="text-sm text-destructive" data-testid="listing-form-errors">
          {form.formState.errors.root.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="submit"
          disabled={busy}
          className="min-h-11 bg-primary text-primary-foreground hover:bg-primary-hover sm:min-h-10"
        >
          Сохранить
        </Button>
        {canSubmitReview ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="min-h-11 sm:min-h-10"
            onClick={() => void submitReview()}
          >
            {submitLabel}
          </Button>
        ) : null}
      </div>
    </form>
  )
}
