import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ListingCard } from './ListingCard'
import type { PublicListingCard } from '../types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...rest
  }: {
    to: string
    params?: Record<string, string>
    children: React.ReactNode
    className?: string
    'data-testid'?: string
  }) => createElement('a', { href: '#', ...rest }, children),
}))

const listing: PublicListingCard = {
  id: 'listing-1',
  title: 'Подсолнечное масло',
  description: 'Холодный отжим',
  price: 280,
  unit: 'л',
  quantity_available: 12,
  photos: ['https://example.com/oil.jpg'],
  category_id: null,
  published_at: '2026-07-20T12:00:00Z',
  seller: { id: 'seller-1', display_name: 'Маслодельня Юг', is_verified: true },
}

describe('ListingCard', () => {
  it('renders title, price and seller', () => {
    const html = renderToStaticMarkup(createElement(ListingCard, { listing }))
    expect(html).toContain('Подсолнечное масло')
    expect(html).toContain('Маслодельня Юг')
    expect(html).toContain('л')
    expect(html).toContain('data-testid="listing-card"')
  })
})
