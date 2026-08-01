import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CatalogToolbar } from './CatalogToolbar'
import type { PublicCategoryNode } from '../types'

vi.mock('@/lib/utils', () => ({
  cn: (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' '),
}))

const categories: PublicCategoryNode[] = [
  {
    id: 'cat-honey',
    name: 'Мёд',
    slug: 'honey',
    icon: null,
    sort_order: 0,
    children: [],
  },
]

describe('CatalogToolbar', () => {
  it('renders search, sort and category chips', () => {
    const html = renderToStaticMarkup(
      createElement(CatalogToolbar, {
        categories,
        categoryId: null,
        onCategoryChange: () => undefined,
        searchInput: 'масло',
        onSearchInputChange: () => undefined,
        sort: 'price_asc',
        onSortChange: () => undefined,
      }),
    )
    expect(html).toContain('value="масло"')
    expect(html).toContain('Мёд')
    expect(html).toContain('Все')
    expect(html).toContain('Цена ↑')
  })
})
