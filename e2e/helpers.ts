import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function waitForShiftsTable(page: Page) {
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
