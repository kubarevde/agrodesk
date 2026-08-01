import type { CatalogSort, PublicCategoryNode, PublicListingCard } from './types'

function formatNumeric(value: number | string): string {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return String(value)
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

export function formatMarketPriceAmount(value: number | string): string {
  return `${formatNumeric(value)} ₽`
}

export function formatMarketPrice(value: number | string, unit: string): string {
  return `${formatMarketPriceAmount(value)} / ${unit}`
}

export function formatMarketQty(value: number | string, unit: string): string {
  return `${formatNumeric(value)} ${unit}`
}

/** Buyer-facing: use only backend quantity_available (no source internals). */
export function isListingInStock(value: number | string): boolean {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) && num > 0
}

/** Product / detail: «В наличии: N ед.» or honest empty. */
export function publicStockLabel(value: number | string, unit: string): string {
  if (!isListingInStock(value)) return 'Сейчас нет в наличии'
  return `В наличии: ${formatMarketQty(value, unit)}`
}

/** Catalog card: short line without technical wording. */
export function publicStockShort(value: number | string, unit: string): string {
  if (!isListingInStock(value)) return 'Нет в наличии'
  return `В наличии ${formatMarketQty(value, unit)}`
}

export function flattenCategories(
  nodes: PublicCategoryNode[],
): { id: string; name: string; depth: number }[] {
  const out: { id: string; name: string; depth: number }[] = []
  const walk = (list: PublicCategoryNode[], depth: number) => {
    for (const node of list) {
      out.push({ id: node.id, name: node.name, depth })
      if (node.children?.length) walk(node.children, depth + 1)
    }
  }
  walk(nodes, 0)
  return out
}

export function sortListings(
  items: PublicListingCard[],
  sort: CatalogSort,
): PublicListingCard[] {
  const copy = [...items]
  const price = (row: PublicListingCard) => Number(row.price)
  const dateMs = (row: PublicListingCard) =>
    row.published_at ? Date.parse(row.published_at) : 0

  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => price(a) - price(b))
    case 'price_desc':
      return copy.sort((a, b) => price(b) - price(a))
    case 'date_asc':
      return copy.sort((a, b) => dateMs(a) - dateMs(b))
    case 'date_desc':
    default:
      return copy.sort((a, b) => dateMs(b) - dateMs(a))
  }
}

export function averageRating(reviews: { rating: number }[]): number | null {
  if (!reviews.length) return null
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

export function photoSrc(photos: string[] | undefined, index = 0): string | null {
  const url = photos?.[index]
  return url && url.trim() ? url.trim() : null
}
