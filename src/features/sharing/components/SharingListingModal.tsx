import { useEffect, useMemo, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { ImageUploader } from '@/components/shared/ImageUploader'
import { RegionSelect } from '@/components/shared/RegionSelect'
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
import { LabeledSelect } from '@/components/ui/labeled-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { LatLngPair } from '@/features/fields/geometry'
import { useFields } from '@/features/fields/hooks'
import { useEquipment } from '@/features/worktime/referenceHooks'
import { polygonContainsPolygon } from '@/lib/maps/geo'
import { regionCodeFromValue } from '@/lib/regions.ru'
import { selectOptions } from '@/lib/selectOptions'
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
import { SharingPartialFieldMap } from './SharingPartialFieldMap'

type SharingListingModalProps = {
  open: boolean
  listing?: SharingListing | null
  preset?: Partial<SharingListingFormValues>
  onClose: () => void
}

function toFormValues(listing: SharingListing): SharingListingFormValues {
  const legacyUnit = listing.priceUnit === '₽/га' ? '₽/гектар' : listing.priceUnit
  return defaultListingFormValues({
    type: listing.type === 'parts' ? 'field' : listing.type,
    title: listing.title,
    description: listing.description ?? '',
    pricePerUnit: listing.pricePerUnit,
    priceUnit: (legacyUnit as SharingListingFormValues['priceUnit']) || '₽/гектар',
    fieldId: listing.fieldId ?? '',
    equipmentId: listing.equipmentId ?? '',
    implementId: listing.implementId ?? '',
    region: regionCodeFromValue(listing.region) ?? listing.region ?? '',
    contactInfo: listing.contactInfo ?? '',
    lat: listing.lat,
    lng: listing.lng,
    images: listing.images,
    sharingScope: listing.sharingScope ?? 'full_field',
    sharedPolygon:
      listing.sharingScope === 'partial_field' ? listing.effectivePolygon : null,
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
  const { data: fields = [] } = useFields()
  const contourFlushRef = useRef<(() => LatLngPair[] | null) | null>(null)

  const form = useForm<SharingListingFormValues>({
    resolver: zodResolver(sharingListingFormSchema),
    defaultValues: defaultListingFormValues(),
  })

  const type = useWatch({ control: form.control, name: 'type' })
  const priceUnit = useWatch({ control: form.control, name: 'priceUnit' })
  const fieldId = useWatch({ control: form.control, name: 'fieldId' })
  const sharingScope = useWatch({ control: form.control, name: 'sharingScope' })
  const sharedPolygon = useWatch({ control: form.control, name: 'sharedPolygon' })

  const selectedField = useMemo(
    () => fields.find((item) => item.id === fieldId) ?? null,
    [fields, fieldId],
  )

  // Reset only when the dialog opens or the edited listing changes — never on
  // parent re-renders (inline `preset` objects would wipe partial-field state).
  useEffect(() => {
    if (!open) return
    form.reset(listing ? toFormValues(listing) : defaultListingFormValues(preset))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: open + listing id only
  }, [open, listing?.id])

  const pending =
    form.formState.isSubmitting || createListing.isPending || updateListing.isPending

  const onSubmit = form.handleSubmit(async (values) => {
    const flushed = contourFlushRef.current?.() ?? null
    if (flushed && flushed.length >= 3) {
      form.setValue('sharedPolygon', flushed, { shouldValidate: true })
    }

    const scope =
      values.type === 'field' ? (values.sharingScope ?? 'full_field') : 'full_field'
    const plot =
      scope === 'partial_field'
        ? flushed && flushed.length >= 3
          ? flushed
          : values.sharedPolygon && values.sharedPolygon.length >= 3
            ? values.sharedPolygon
            : null
        : null

    if (scope === 'partial_field') {
      if (!plot || plot.length < 3) {
        toast.error('Нарисуйте участок внутри контура поля и нажмите «Завершить»')
        return
      }
      if (
        selectedField?.polygon &&
        !polygonContainsPolygon(selectedField.polygon, plot)
      ) {
        toast.error('Участок должен полностью находиться внутри границ поля')
        return
      }
    }

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
      values.priceUnit === 'договорная' || !values.priceUnit
        ? values.priceUnit || null
        : values.priceUnit
    const price = priceUnitValue === 'договорная' ? null : (values.pricePerUnit ?? null)

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
        sharingScope: scope,
        sharedPolygon: plot,
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
        sharingScope: scope,
        sharedPolygon: plot,
      })
    }
    onClose()
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                    form.setValue('sharingScope', 'full_field')
                    form.setValue('sharedPolygon', null)
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
            onFieldChange={() => {
              form.setValue('sharedPolygon', null)
              if (form.getValues('sharingScope') === 'partial_field') {
                // keep scope; user must redraw for the new field
              }
            }}
          />

          {type === 'field' ? (
            <div className="space-y-2">
              <Label>Объём шеринга</Label>
              <Controller
                name="sharingScope"
                control={form.control}
                render={({ field }) => (
                  <LabeledSelect
                    value={field.value}
                    options={selectOptions([
                      { value: 'full_field', label: 'Всё поле' },
                      { value: 'partial_field', label: 'Часть поля' },
                    ])}
                    placeholder="Объём"
                    onValueChange={(value) => {
                      if (value === 'partial_field' || value === 'full_field') {
                        field.onChange(value)
                        if (value === 'full_field') {
                          form.setValue('sharedPolygon', null)
                        }
                      }
                    }}
                  />
                )}
              />
            </div>
          ) : null}

          {type === 'field' && sharingScope === 'partial_field' ? (
            <div className="space-y-1">
              <SharingPartialFieldMap
                fieldPolygon={selectedField?.polygon}
                sharedPolygon={sharedPolygon}
                flushRef={contourFlushRef}
                onChange={(polygon) => {
                  form.setValue('sharedPolygon', polygon, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  if (polygon && polygon.length >= 3) {
                    const midLat =
                      polygon.reduce((s, p) => s + p[0], 0) / polygon.length
                    const midLng =
                      polygon.reduce((s, p) => s + p[1], 0) / polygon.length
                    form.setValue('lat', midLat)
                    form.setValue('lng', midLng)
                  }
                }}
              />
              {form.formState.errors.sharedPolygon ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.sharedPolygon.message}
                </p>
              ) : null}
              {selectedField?.polygon &&
              sharedPolygon &&
              sharedPolygon.length >= 3 &&
              !polygonContainsPolygon(selectedField.polygon, sharedPolygon) ? (
                <p className="text-xs text-destructive">
                  Участок выходит за границы поля — сохранение недоступно
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="listing-title">Заголовок объявления</Label>
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
                    value={field.value || '₽/гектар'}
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

          <RegionSelect
            label="Регион"
            value={form.watch('region') || null}
            emptyLabel="Не указан"
            onValueChange={(code) =>
              form.setValue('region', code ?? '', { shouldDirty: true, shouldValidate: true })
            }
          />

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
