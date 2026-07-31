import { expect, test, type Page } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

const API = process.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
  expect(token).toBeTruthy()
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function createRequestViaApi(page: Page): Promise<string> {
  const headers = await authHeaders(page)
  const items = await page.request.get(`${API}/api/inventory`, { headers })
  expect(items.ok()).toBeTruthy()
  const list = (await items.json()) as Array<{ id: string; current_stock: number; is_active: boolean }>
  const item = list.find((row) => row.is_active && Number(row.current_stock) >= 1) ?? list[0]
  expect(item).toBeTruthy()

  const planned = new Date(Date.now() + 24 * 3600_000).toISOString()
  const created = await page.request.post(`${API}/api/shipment-requests`, {
    headers,
    data: {
      customer_name: 'E2E Покупатель',
      inventory_item_id: item.id,
      quantity: 1,
      price: 10,
      planned_at: planned,
      priority: 'normal',
    },
  })
  expect(created.ok()).toBeTruthy()
  const body = (await created.json()) as { id: string }
  return body.id
}

/**
 * Happy-path: create (API) → start/complete in manager UI → report listed.
 * Dialog create is covered by Vitest; e2e focuses on list lifecycle + reports entry.
 */
test.describe('shipment requests', () => {
  test('start → complete → done → report available', async ({ page }) => {
    test.setTimeout(90_000)
    await loginDemoAdmin(page)
    const requestId = await createRequestViaApi(page)

    await page.goto('/shipment-requests')
    await page.getByRole('heading', { name: 'Заявки на отгрузку' }).waitFor({ timeout: 20_000 })

    const tableRow = page.locator(
      `[data-testid="shipment-request-table-${requestId}"][data-status="new"]`,
    )
    await expect(tableRow).toBeVisible({ timeout: 20_000 })
    await tableRow.getByRole('button', { name: 'В работу' }).click()

    const inProgress = page.locator(
      `[data-testid="shipment-request-table-${requestId}"][data-status="in_progress"]`,
    )
    await expect(inProgress).toBeVisible({ timeout: 15_000 })
    await inProgress.getByRole('button', { name: 'Выполнить' }).click()

    await expect(
      page.locator(`[data-testid="shipment-request-table-${requestId}"][data-status="done"]`),
    ).toBeVisible({ timeout: 20_000 })

    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'Отчёты' })).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByText('Операционный срез ТМЦ: план, статус, исполнитель, смена (не культуры)'),
    ).toBeVisible()
  })
})
