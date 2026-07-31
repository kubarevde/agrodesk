import { expect, test, type Page } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

const API = process.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
  expect(token).toBeTruthy()
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

/**
 * Collect harvest on field → request on harvest SKU → complete → stock decreases.
 */
test.describe('harvest outbound via shipment requests', () => {
  test('collect → request → complete decreases stock', async ({ page }) => {
    test.setTimeout(120_000)
    await loginDemoAdmin(page)
    const headers = await authHeaders(page)

    const fieldRes = await page.request.post(`${API}/api/fields`, {
      headers,
      data: {
        name: `E2E harvest field ${Date.now()}`,
        crop_code: 'wheat',
        area_ha: 5,
      },
    })
    expect(fieldRes.ok()).toBeTruthy()
    const field = (await fieldRes.json()) as { id: string; crop_code: string | null }
    const cropCode = (field.crop_code ?? 'wheat').trim() || 'wheat'

    const itemRes = await page.request.post(`${API}/api/inventory`, {
      headers,
      data: {
        name: `E2E harvest SKU ${Date.now()}`,
        category: 'harvest',
        unit: 'кг',
        current_stock: 0,
        min_stock: 0,
        total_capacity: 100000,
        crop_code: cropCode,
      },
    })
    expect(itemRes.ok()).toBeTruthy()
    const item = (await itemRes.json()) as { id: string }

    const harvestRes = await page.request.post(`${API}/api/fields/${field.id}/harvest`, {
      headers,
      data: {
        inventory_item_id: item.id,
        quantity: 200,
        date: new Date().toISOString().slice(0, 10),
      },
    })
    expect(harvestRes.ok()).toBeTruthy()

    const afterIncome = await page.request.get(`${API}/api/inventory/${item.id}`, { headers })
    expect(afterIncome.ok()).toBeTruthy()
    const stockAfterIncome = Number((await afterIncome.json()).current_stock)
    expect(stockAfterIncome).toBeGreaterThanOrEqual(200)

    const planned = new Date(Date.now() + 24 * 3600_000).toISOString()
    const created = await page.request.post(`${API}/api/shipment-requests`, {
      headers,
      data: {
        customer_name: 'E2E Harvest Buyer',
        inventory_item_id: item.id,
        quantity: 50,
        price: 11,
        planned_at: planned,
        priority: 'normal',
      },
    })
    expect(created.ok()).toBeTruthy()
    const request = (await created.json()) as { id: string; kind: string }
    expect(request.kind).toBe('harvest')

    await page.goto('/shipment-requests')
    await page.getByRole('heading', { name: 'Заявки на отгрузку' }).waitFor({ timeout: 20_000 })

    const tableRow = page.locator(
      `[data-testid="shipment-request-table-${request.id}"][data-status="new"]`,
    )
    await expect(tableRow).toBeVisible({ timeout: 20_000 })
    await expect(tableRow).toHaveAttribute('data-kind', 'harvest')
    await tableRow.getByRole('button', { name: 'В работу' }).click()

    const inProgress = page.locator(
      `[data-testid="shipment-request-table-${request.id}"][data-status="in_progress"]`,
    )
    await expect(inProgress).toBeVisible({ timeout: 15_000 })
    await inProgress.getByRole('button', { name: 'Выполнить' }).click()

    await expect(
      page.locator(`[data-testid="shipment-request-table-${request.id}"][data-status="done"]`),
    ).toBeVisible({ timeout: 20_000 })

    const afterExpense = await page.request.get(`${API}/api/inventory/${item.id}`, { headers })
    expect(afterExpense.ok()).toBeTruthy()
    expect(Number((await afterExpense.json()).current_stock)).toBe(stockAfterIncome - 50)

    await page.goto('/inventory')
    await expect(page.getByRole('heading', { name: /Склад|ТМЦ/i }).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
