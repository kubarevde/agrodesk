import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** Demo org admin — requires seeded API (EMP000 / 1234). */
export async function loginDemoAdmin(page: Page) {
  await page.goto('/login')
  // Already authenticated → redirected away from login
  if (!page.url().includes('/login')) {
    return
  }

  await page.waitForTimeout(500)
  if (!(await page.locator('#email').isVisible().catch(() => false))) {
    const demo = page.getByRole('option', { name: /Demo AgroDesk/i })
    await expect(demo).toBeVisible({ timeout: 20_000 })
    await demo.click()
    await page.getByRole('button', { name: 'Продолжить' }).click()
  }

  await page.locator('#email').waitFor({ timeout: 10_000 })
  await page.locator('#email').fill('EMP000')
  await page.locator('#password').fill('1234')
  await page.getByRole('button', { name: /Войти/i }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
}

export async function waitForShiftsTable(page: Page) {
  await loginDemoAdmin(page)
  await page.goto('/worktime')
  await page.getByRole('heading', { name: 'Рабочее время' }).waitFor()
  await page.locator('table tbody tr').first().waitFor({ timeout: 15_000 })
}

export async function selectFormOption(page: Page, label: string, option: string) {
  const field = page.locator('.space-y-2').filter({
    has: page.getByText(label, { exact: true }),
  })
  await field.getByRole('combobox').click()
  await page.getByRole('option', { name: option }).click()
}

export async function openShift(page: Page, location: string, workType: string) {
  await page.getByRole('button', { name: 'Открыть смену' }).click()
  await page.getByRole('dialog', { name: 'Открыть смену' }).waitFor()

  await selectFormOption(page, 'Объект', location)
  await selectFormOption(page, 'Тип работ', workType)

  await page.getByRole('button', { name: 'Начать смену' }).click()
}

export async function findShiftRow(page: Page, location: string): Promise<Locator> {
  const backButton = page.getByRole('button', { name: 'Назад' })
  while (await backButton.isEnabled()) {
    await backButton.click()
    await page.waitForTimeout(200)
  }

  const row = page.locator('table tbody tr').filter({ hasText: location })

  for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
    if ((await row.count()) > 0) {
      return row.first()
    }

    const nextButton = page.getByRole('button', { name: 'Вперёд' })
    if (await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(300)
    } else {
      break
    }
  }

  await expect(row.first()).toBeVisible({ timeout: 10_000 })
  return row.first()
}
