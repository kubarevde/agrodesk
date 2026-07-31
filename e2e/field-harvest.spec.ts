import { expect, test } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

test.describe('field harvest → inventory', () => {
  test('fields page exposes collect harvest action', async ({ page }) => {
    test.setTimeout(60_000)
    await loginDemoAdmin(page)
    await page.goto('/fields')
    await expect(page.getByRole('heading', { name: 'Поля' })).toBeVisible({
      timeout: 20_000,
    })

    const harvestBtn = page.getByRole('button', { name: 'Собрать урожай' }).first()
    const hasFields = await harvestBtn.isVisible().catch(() => false)
    if (!hasFields) {
      test.skip(true, 'No fields in demo org to collect harvest from')
      return
    }

    await harvestBtn.click()
    await expect(page.getByRole('heading', { name: /Собрать урожай/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
