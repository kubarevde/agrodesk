import { expect, test } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

test.describe('shipments (crop)', () => {
  test('page shows crop heading and ТМЦ overview panel or empty state', async ({ page }) => {
    test.setTimeout(60_000)
    await loginDemoAdmin(page)
    await page.goto('/shipments')
    await expect(page.getByRole('heading', { name: 'Отгрузки урожая' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.getByText(/Учёт реализации культур|Наряды на ТМЦ/i).first(),
    ).toBeVisible()
    // Panel is shown for managers when feature flag is on.
    const panel = page.getByTestId('shipments-tmc-outbound')
    await expect(panel).toBeVisible({ timeout: 15_000 })
    await expect(panel.getByText('Отгрузки ТМЦ по заявкам')).toBeVisible()
  })
})
