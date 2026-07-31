import { expect, test, type Page } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

const API = process.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
  expect(token).toBeTruthy()
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

test.describe('shipment ↔ harvest request link', () => {
  test('link done harvest request to crop shipment via API and see KPI list', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await loginDemoAdmin(page)
    const headers = await authHeaders(page)

    const itemRes = await page.request.post(`${API}/api/inventory`, {
      headers,
      data: {
        name: `E2E link harvest ${Date.now()}`,
        category: 'harvest',
        unit: 'кг',
        current_stock: 500,
        min_stock: 0,
        total_capacity: 10000,
        crop_code: 'wheat',
      },
    })
    expect(itemRes.ok()).toBeTruthy()
    const item = (await itemRes.json()) as { id: string }

    const planned = new Date(Date.now() + 24 * 3600_000).toISOString()
    const reqRes = await page.request.post(`${API}/api/shipment-requests`, {
      headers,
      data: {
        customer_name: 'E2E Link Buyer',
        inventory_item_id: item.id,
        quantity: 30,
        price: 16,
        planned_at: planned,
        priority: 'normal',
      },
    })
    expect(reqRes.ok()).toBeTruthy()
    const req = (await reqRes.json()) as { id: string }
    expect(
      (await page.request.post(`${API}/api/shipment-requests/${req.id}/start`, { headers })).ok(),
    ).toBeTruthy()
    expect(
      (
        await page.request.post(`${API}/api/shipment-requests/${req.id}/complete`, {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy()

    const shipRes = await page.request.post(`${API}/api/shipments`, {
      headers,
      data: {
        date: new Date().toISOString().slice(0, 10),
        crop_code: 'wheat',
        crop_type: 'Пшеница',
        quantity_kg: 30,
        destination: 'E2E Link Elevator',
        price_per_kg: 16,
        shipment_request_id: req.id,
      },
    })
    expect(shipRes.ok()).toBeTruthy()
    const shipment = (await shipRes.json()) as { id: string; shipment_request_id: string }
    expect(shipment.shipment_request_id).toBe(req.id)

    await page.goto('/shipments')
    await expect(page.getByRole('heading', { name: 'Отгрузки урожая' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('E2E Link Elevator').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/по заявке #/i).first()).toBeVisible()

    await page.goto(`/shipment-requests/${req.id}`)
    await expect(page.getByRole('heading', { name: 'Заявка' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Доход по урожаю')).toBeVisible()
    await expect(page.getByText(/30/).first()).toBeVisible()
  })
})
