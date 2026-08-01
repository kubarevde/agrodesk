import type { ListingStatus, OrderStatus } from './types'

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Черновик',
  pending_review: 'На модерации',
  published: 'Опубликован',
  rejected: 'Отклонён',
  archived: 'Архив',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новая',
  contacted: 'Связались',
  confirmed: 'Подтверждена',
  completed: 'Выполнена',
  cancelled: 'Отменена',
}

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['contacted', 'cancelled'],
  contacted: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function isListingFormReady(values: {
  title: string
  price: number
  quantity_available: number
  category_id: string
  photos: string[]
}): string[] {
  const errors: string[] = []
  if (!values.title.trim()) errors.push('Укажите название')
  if (!values.category_id) errors.push('Выберите категорию')
  if (!(values.price > 0)) errors.push('Цена должна быть больше 0')
  if (!(values.quantity_available > 0)) errors.push('Количество должно быть больше 0')
  if (!values.photos.length) errors.push('Добавьте хотя бы одно фото')
  return errors
}

/** UI shows rejection_reason only for rejected listings with a non-empty reason. */
export function listingRejectionVisible(listing: {
  status: ListingStatus
  rejection_reason: string | null
}): string | null {
  if (listing.status !== 'rejected') return null
  const reason = listing.rejection_reason?.trim()
  return reason || null
}
