import { expect, test } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

test.describe('shipments (crop)', () => {
  test('page shows crop heading and ТМЦ tab', async ({ page }) => {
    test.setTimeout(60_000)
    await loginDemoAdmin(page)
    await page.goto('/shipments')
    // Product change: page h1 is «Отгрузки» with tabs Урожай / ТМЦ со склада.
    await expect(page.getByRole('heading', { name: 'Отгрузки' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByRole('tab', { name: /Урожай/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /ТМЦ со склада/i })).toBeVisible()

    await page.getByRole('tab', { name: /ТМЦ со склада/i }).click()
    await expect(page.getByTestId('tmc-shipments-tab')).toBeVisible({ timeout: 15_000 })
  })
})
