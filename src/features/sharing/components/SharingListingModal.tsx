import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useEquipment } from '@/features/worktime/referenceHooks'
import {
  useCreateSharingListing,
  useUpdateSharingListing,
} from '../hooks'
import {
  defaultListingFormValues,
  listingTypeOptions,
  sharingListingFormSchema,
  type SharingListingFormValues,
} from '../schemas'
import { PRICE_UNITS, type SharingListing } from '../types'
import { SharingListingResourceFields } from './SharingListingResourceFields'

type SharingListingModalProps = {
  open: boolean
  listing?: SharingListing | null
  preset?: Partial<SharingListingFormValues>
  onClose: () => void
}

function toFormValues(listing: SharingListing): SharingListingFormValues {
  return defaultListingFormValues({
    type: listing.type,
    title: listing.title,
    description: listing.description ?? '',
    pricePerUnit: listing.pricePerUnit,
    priceUnit: (listing.priceUnit as SharingListingFormValues['priceUnit']) || '₽/га',
    fieldId: listing.fieldId ?? '',
    equipmentId: listing.equipmentId ?? '',
    implementId: listing.implementId ?? '',
    region: listing.region ?? '',
    contactInfo: listing.contactInfo ?? '',
    lat: listing.lat,
    lng: listing.lng,
    images: listing.images,
  })
}

export function SharingListingModal({
  open,
  listing,
  preset,
  onClose,
}: SharingListingModalProps) {
  const isEdit = Boolean(listing)
  const createListing = useCreateSharingListing()
  const updateListing = useUpdateSharingListing()
  const { data: equipment = [] } = useEquipment()

  const form = useForm<SharingListingFormValues>({
    resolver: zodResolver(sharingListingFormSchema),
    defaultValues: defaultListingFormValues(),
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const priceUnit = useWatch({ control: form.control, name: 'priceUnit' })

  useEffect(() => {
    if (!open) return
    form.reset(listing ? toFormValues(listing) : defaultListingFormValues(preset))
  }, [listing?.id, open, preset])
  // form.reset intentionally omitted from deps — stable enough; listing object ref is not

  const pending =
    form.formState.isSubmitting || createListing.isPending || updateListing.isPending

  const onSubmit = form.handleSubmit(async (values) => {
    let description = values.description?.trim() || ''
    if (values.relatedEquipmentId) {
      const related = equipment.find((item) => item.id === values.relatedEquipmentId)
      if (related) {
        const line = `Связанная техника: ${related.name}`
        if (!description.includes(line)) {
          description = description ? `${description}\n${line}` : line
        }
      }
    }

    const priceUnitValue =
      values.priceUnit === 'договорная' || !values.priceUnit ? values.priceUnit || null : values.priceUnit
    const price =
      priceUnitValue === 'договорная' ? null : (values.pricePerUnit ?? null)

    if (listing) {
      await updateListing.mutateAsync({
        id: listing.id,
        title: values.title,
        description,
        pricePerUnit: price,
        priceUnit: priceUnitValue,
        region: values.region,
        contactInfo: values.contactInfo,
        lat: values.lat,
        lng: values.lng,
        images: values.images ?? [],
      })
    } else {
      await createListing.mutateAsync({
        type: values.type,
        title: values.title,
        description,
        pricePerUnit: price,
        priceUnit: priceUnitValue,
        fieldId: values.type === 'field' ? values.fieldId : undefined,
        equipmentId: values.type === 'equipment' ? values.equipmentId : undefined,
        implementId: values.type === 'implement' ? values.implementId : undefined,
        region: values.region,
        contactInfo: values.contactInfo,
        lat: values.lat,
        lng: values.lng,
        images: values.images ?? [],
      })
    }
    onClose()
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать объявление' : 'Разместить объявление'}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label>Тип объявления</Label>
            <Controller
              name="type"
              control={form.control}
              render={({ field, fieldState }) => (
                <Select
                  value={field.value}
                  disabled={isEdit}
                  items={listingTypeOptions()}
                  onValueChange={(value) => {
                    field.onChange(value)
                    form.setValue('fieldId', '')
                    form.setValue('equipmentId', '')
                    form.setValue('implementId', '')
                    form.setValue('relatedEquipmentId', '')
                    form.setValue('lat', null)
                    form.setValue('lng', null)
                  }}
                >
                  <SelectTrigger className="w-full" aria-invalid={Boolean(fieldState.error)}>
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {listingTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <SharingListingResourceFields
            control={form.control}
            setValue={form.setValue}
            disabledResource={isEdit}
          />

          <div className="space-y-2">
            <Label htmlFor="listing-title">
              {type === 'parts' ? 'Название' : 'Заголовок объявления'}
            </Label>
            <Input
              id="listing-title"
              aria-invalid={Boolean(form.formState.errors.title)}
              {...form.register('title')}
            />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-description">Подробное описание</Label>
            <Textarea id="listing-description" rows={3} {...form.register('description')} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="listing-price">Цена</Label>
              <Input
                id="listing-price"
                type="number"
                min={0}
                step="any"
                disabled={priceUnit === 'договорная'}
                {...form.register('pricePerUnit', {
                  setValueAs: (value) =>
                    value === '' || value == null ? null : Number(value),
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Единица</Label>
              <Controller
                name="priceUnit"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || '₽/га'}
                    items={PRICE_UNITS.map((unit) => ({ value: unit, label: unit }))}
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (value === 'договорная') form.setValue('pricePerUnit', null)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-region">Регион</Label>
            <Input id="listing-region" {...form.register('region')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="listing-contact">Контактная информация</Label>
            <Input
              id="listing-contact"
              placeholder="Телефон или Telegram"
              {...form.register('contactInfo')}
            />
          </div>

          <div className="space-y-2">
            <Label>Фото</Label>
            <Controller
              name="images"
              control={form.control}
              render={({ field }) => (
                <ImageUploader
                  value={field.value ?? []}
                  onChange={field.onChange}
                  folder="sharing"
                  maxFiles={5}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? 'Сохранить' : 'Разместить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
