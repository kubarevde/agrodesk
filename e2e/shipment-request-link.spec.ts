import { expect, test, type Page } from '@playwright/test'
import { gotoPath, loginDemoAdmin } from './helpers'

const API = process.env.VITE_API_PROXY_TARGET || process.env.VITE_API_URL || 'http://127.0.0.1:8001'

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

    await page.goto('/shipments', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Отгрузки' })).toBeVisible({
      timeout: 20_000,
    })
    // Product: harvest list may keep inactive/hidden nodes; assert via API then detail page.
    const listRes = await page.request.get(`${API}/api/shipments`, { headers })
    expect(listRes.ok(), await listRes.text()).toBeTruthy()
    const shipments = (await listRes.json()) as Array<{
      id: string
      destination?: string | null
      elevator?: string | null
      shipment_request_id?: string | null
    }>
    const linked = shipments.find((s) => s.id === shipment.id || s.shipment_request_id === req.id)
    expect(linked, 'linked harvest shipment in API list').toBeTruthy()
    const dest = String(linked?.destination ?? linked?.elevator ?? '')
    expect(dest).toMatch(/E2E Link Elevator/i)

    await gotoPath(page, `/shipment-requests/${req.id}`)
    await expect(page.getByRole('heading', { name: 'Заявка' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Доход по урожаю')).toBeVisible()
    await expect(page.getByText(/30/).first()).toBeVisible()
  })
})
