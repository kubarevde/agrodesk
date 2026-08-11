import { expect, test } from '@playwright/test'
import { API, loginDemoAdmin } from './helpers'

test.describe('field harvest → inventory', () => {
  test('fields page exposes collect harvest action', async ({ page }) => {
    test.setTimeout(60_000)
    await loginDemoAdmin(page)

    // Ensure at least one field exists (no skip).
    const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
    expect(token).toBeTruthy()
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const list = await page.request.get(`${API}/api/fields`, { headers })
    expect(list.ok(), await list.text()).toBeTruthy()
    const fields = (await list.json()) as Array<{ id: string }>
    if (fields.length === 0) {
      const created = await page.request.post(`${API}/api/fields`, {
        headers,
        data: { name: `E2E harvest field ${Date.now()}`, area_ha: 1 },
      })
      expect(created.ok(), await created.text()).toBeTruthy()
    }

    await page.goto('/fields')
    await expect(page.getByRole('heading', { name: 'Поля' })).toBeVisible({
      timeout: 20_000,
    })

    // Click inner harvest button on card (card itself is also role=button).
    const harvestBtn = page
      .getByTestId('field-card')
      .first()
      .getByRole('button', { name: 'Собрать урожай' })
    await expect(harvestBtn).toBeVisible({ timeout: 15_000 })
    await harvestBtn.click()
    await expect(page.getByRole('dialog', { name: /Собрать урожай/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
