import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()

vi.mock('../publicApi', () => ({
  publicMarketplaceApi: {
    post: (...args: unknown[]) => post(...args),
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}))

vi.mock('@/components/ui/button', () => ({
  Button: (props: { children?: unknown; type?: string; disabled?: boolean }) =>
    createElement('button', { type: props.type, disabled: props.disabled }, props.children as never),
}))

import { createPublicOrder } from '../api'
import { OrderForm } from './OrderForm'

describe('OrderForm + public order API', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('renders order fields and submit control', () => {
    const html = renderToStaticMarkup(
      createElement(OrderForm, {
        listingId: 'listing-1',
        maxQuantity: 10,
        unit: 'кг',
      }),
    )
    expect(html).toContain('Оставить заявку')
    expect(html).toContain('buyer_name')
    expect(html).toContain('buyer_phone')
    expect(html).toContain('data-testid="order-form"')
  })

  it('posts order payload without Authorization client', async () => {
    post.mockResolvedValue({
      data: {
        id: 'ord-1',
        listing_id: 'listing-1',
        buyer_name: 'Иван',
        quantity: 2,
        status: 'new',
        created_at: '2026-07-30T10:00:00Z',
      },
    })

    const result = await createPublicOrder({
      listing_id: 'listing-1',
      buyer_name: 'Иван',
      buyer_phone: '+79001112233',
      buyer_comment: null,
      quantity: 2,
    })

    expect(post).toHaveBeenCalledWith('/api/public/marketplace/orders', {
      listing_id: 'listing-1',
      buyer_name: 'Иван',
      buyer_phone: '+79001112233',
      buyer_comment: null,
      quantity: 2,
    })
    expect(result.id).toBe('ord-1')
  })

  it('surfaces API rejection for callers', async () => {
    post.mockRejectedValue(new Error('Слишком много заявок'))
    await expect(
      createPublicOrder({
        listing_id: 'listing-1',
        buyer_name: 'Иван',
        buyer_phone: '+79001112233',
        quantity: 1,
      }),
    ).rejects.toThrow('Слишком много заявок')
  })
})
