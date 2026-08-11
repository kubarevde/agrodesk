import { z } from 'zod'
import { PRICE_UNITS, type SharingListingType } from './types'

const listingTypes = ['field', 'equipment', 'implement'] as const
const sharingScopes = ['full_field', 'partial_field'] as const

export const sharingListingFormSchema = z
  .object({
    type: z.enum(listingTypes, { message: 'Выберите тип' }),
    title: z.string().min(3, 'Минимум 3 символа').max(200),
    description: z.string().optional(),
    pricePerUnit: z.number().nullable().optional(),
    priceUnit: z.string().optional(),
    fieldId: z.string().optional(),
    equipmentId: z.string().optional(),
    implementId: z.string().optional(),
    relatedEquipmentId: z.string().optional(),
    region: z.string().optional(),
    contactInfo: z.string().optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    images: z.array(z.string()).max(5).optional(),
    sharingScope: z.enum(sharingScopes),
    sharedPolygon: z.array(z.array(z.number())).nullable().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'field' && !values.fieldId) {
      ctx.addIssue({ code: 'custom', message: 'Выберите поле', path: ['fieldId'] })
    }
    if (values.type === 'equipment' && !values.equipmentId) {
      ctx.addIssue({ code: 'custom', message: 'Выберите технику', path: ['equipmentId'] })
    }
    if (values.type === 'implement' && !values.implementId) {
      ctx.addIssue({ code: 'custom', message: 'Выберите приспособление', path: ['implementId'] })
    }
    if (
      values.priceUnit &&
      values.priceUnit !== 'договорная' &&
      (values.pricePerUnit == null || values.pricePerUnit <= 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Укажите цену или выберите «договорная»',
        path: ['pricePerUnit'],
      })
    }
    if (
      values.type === 'field' &&
      values.sharingScope === 'partial_field' &&
      (!values.sharedPolygon || values.sharedPolygon.length < 3)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Нарисуйте участок внутри контура поля',
        path: ['sharedPolygon'],
      })
    }
  })

export type SharingListingFormValues = z.infer<typeof sharingListingFormSchema>

export function defaultListingFormValues(
  overrides?: Partial<SharingListingFormValues>,
): SharingListingFormValues {
  return {
    type: 'field',
    title: '',
    description: '',
    pricePerUnit: null,
    priceUnit: '₽/гектар',
    fieldId: '',
    equipmentId: '',
    implementId: '',
    relatedEquipmentId: '',
    region: '',
    contactInfo: '',
    lat: null,
    lng: null,
    images: [],
    sharingScope: 'full_field',
    sharedPolygon: null,
    ...overrides,
  }
}

export function listingTypeOptions(): Array<{ value: SharingListingType; label: string }> {
  return [
    { value: 'field', label: 'Поле' },
    { value: 'equipment', label: 'Техника' },
    { value: 'implement', label: 'Приспособления' },
  ]
}

export { PRICE_UNITS }
