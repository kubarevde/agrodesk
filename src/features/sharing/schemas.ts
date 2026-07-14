import { z } from 'zod'
import type { SharingListingType } from './types'

const listingTypes = ['field', 'equipment', 'implement', 'parts'] as const

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
    priceUnit: '₽/га',
    fieldId: '',
    equipmentId: '',
    implementId: '',
    relatedEquipmentId: '',
    region: '',
    contactInfo: '',
    lat: null,
    lng: null,
    images: [],
    ...overrides,
  }
}

export function listingTypeOptions(): Array<{ value: SharingListingType; label: string }> {
  return [
    { value: 'field', label: 'Поле / земля' },
    { value: 'equipment', label: 'Техника' },
    { value: 'implement', label: 'Приспособление / навеска' },
    { value: 'parts', label: 'Запчасти / прочее' },
  ]
}
