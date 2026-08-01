import axios from 'axios'
import { apiErrorMessage } from '@/lib/apiError'
import type { ListingStatus, OrderStatus } from './types'

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Черновик',
  pending_review: 'На модерации',
  published: 'Опубликован',
  rejected: 'Отклонён',
  archived: 'Архив',
}

/** Short seller-facing hint under the status in the list (no new status model). */
export const LISTING_STATUS_HINTS: Record<ListingStatus, string> = {
  draft: 'Можно править и отправить на модерацию',
  pending_review: 'Ждёт решения модератора — самопубликации нет',
  published: 'Видно на витрине /market',
  rejected: 'Исправьте замечания и отправьте снова',
  archived: 'Скрыто с витрины и из активной работы',
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

/** Primary list CTA label — same edit route for all statuses. */
export function listingListActionLabel(status: ListingStatus): string {
  if (status === 'rejected') return 'Исправить'
  if (status === 'draft') return 'Редактировать'
  return 'Открыть'
}

export function listingCanSubmitForReview(status: ListingStatus | undefined): boolean {
  return status == null || status === 'draft' || status === 'rejected'
}

export type ImportFromSourceErrorInfo = {
  message: string
  /** Existing listing id from backend 409 detail, if present. */
  listingId: string | null
}

/**
 * Parse import errors. Backend 409 detail may be
 * `{ message, listing_id, status }` — keep 409 semantics, improve seller UX.
 */
export function parseImportFromSourceError(
  error: unknown,
  fallback = 'Импорт не выполнен',
): ImportFromSourceErrorInfo {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const bag = detail as { message?: unknown; listing_id?: unknown }
      const message =
        typeof bag.message === 'string' && bag.message.trim()
          ? bag.message.trim()
          : null
      const listingId =
        typeof bag.listing_id === 'string' && bag.listing_id.trim()
          ? bag.listing_id.trim()
          : null
      if (message || listingId) {
        return {
          message:
            message ??
            'По этому источнику уже есть активное объявление. Откройте его или архивируйте перед повторным импортом.',
          listingId,
        }
      }
    }
    if (typeof detail === 'string' && detail.trim()) {
      return { message: detail.trim(), listingId: null }
    }
    if (error.response?.status === 409) {
      return {
        message:
          'По этой позиции уже есть активное объявление. Откройте черновик в списке или архивируйте его перед повторным импортом. Склад при импорте не списывается.',
        listingId: null,
      }
    }
  }
  return { message: apiErrorMessage(error, fallback), listingId: null }
}

/** Seller banner for source-linked listings (qty is live from warehouse/shipment). */
export function listingSourceLinkLabel(
  sourceType: string | null | undefined,
): string | null {
  if (sourceType === 'inventory') {
    return 'Количество синхронизируется со складом'
  }
  if (sourceType === 'shipment') {
    return 'Количество синхронизируется с отгрузкой'
  }
  return null
}

export function isSourceLinkedListing(listing: {
  quantity_mode?: 'manual' | 'source'
  source_type?: string | null
  source_id?: string | null
}): boolean {
  if (listing.quantity_mode === 'source') return true
  return (
    (listing.source_type === 'inventory' || listing.source_type === 'shipment') &&
    Boolean(listing.source_id)
  )
}

/** List row caption under price — no technical source_type codes. */
export function listingQtyListCaption(listing: {
  quantity_available: number | string
  unit: string
  quantity_mode?: 'manual' | 'source'
  source_type?: string | null
  source_id?: string | null
  source_missing?: boolean
}): string {
  const qty = Number(listing.quantity_available)
  const qtyText = Number.isFinite(qty)
    ? qty.toLocaleString('ru-RU')
    : String(listing.quantity_available)
  const base = `${qtyText} ${listing.unit}`
  if (!isSourceLinkedListing(listing)) return base
  if (listing.source_missing) return `${base} · источник недоступен`
  if (listing.source_type === 'shipment') return `${base} · синхр. с отгрузкой`
  return `${base} · синхр. со складом`
}
