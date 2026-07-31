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
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}

/** Demo employee (EMP001) — messenger / non-admin flows. */
export async function loginDemoEmployee(page: Page, code = 'EMP001') {
  await page.goto('/login')
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
  await page.locator('#email').fill(code)
  await page.locator('#password').fill('1234')
  await page.getByRole('button', { name: /Войти/i }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(400)
}

/** Navigate with retries — Vite HMR / auth redirects can abort the first goto. */
export async function gotoPath(page: Page, path: string) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      return
    } catch (error) {
      lastError = error
      await page.waitForTimeout(500)
    }
  }
  throw lastError
}

export async function waitForShiftsTable(page: Page) {
  await loginDemoAdmin(page)
  await page.goto('/worktime')
  await page.getByRole('heading', { name: 'Рабочее время' }).waitFor()
  await page.locator('table tbody tr').first().waitFor({ timeout: 15_000 })
}

/** Close leftover open shifts so openShift is not blocked by API 409. */
export async function closeAllOpenShifts(page: Page) {
  const statusCombobox = page.getByRole('combobox').nth(1)
  await statusCombobox.click()
  await page.getByRole('option', { name: 'Открытые' }).click()
  await page.waitForTimeout(500)

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const openRow = page.locator('table tbody tr').filter({ hasText: 'Открыта' }).first()
    if ((await openRow.count()) === 0) {
      break
    }

    await openRow.getByRole('button', { name: 'Действия' }).click()
    await page.getByRole('menuitem', { name: 'Закрыть' }).click()
    await page.getByRole('dialog', { name: 'Завершить смену' }).waitFor()
    await page.getByLabel('Что сделано за смену?').fill('e2e cleanup')
    await page.getByRole('button', { name: 'Завершить смену' }).click()
    await expect(page.getByText(/Смена закрыта/)).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(400)
  }

  await statusCombobox.click()
  await page.getByRole('option', { name: 'Все' }).click()
  await page.locator('table tbody tr').first().waitFor({ timeout: 15_000 }).catch(() => undefined)
  await page.waitForTimeout(300)
}

export async function selectFormOption(page: Page, label: string, option: string) {
  const field = page.locator('.space-y-2').filter({
    has: page.getByText(label, { exact: true }),
  })
  await field.getByRole('combobox').click()
  await page.getByRole('option', { name: option }).click()
}

export async function openShift(page: Page, location: string, workType: string) {
  // Avoid API 409 when a previous run left EMP001 with an open shift.
  await closeAllOpenShifts(page)

  await page.getByRole('button', { name: 'Открыть смену' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Открыть смену/ })
  await dialog.waitFor()

  const employeeField = dialog.locator('.space-y-2').filter({
    has: page.getByText('Сотрудник', { exact: true }),
  })
  if ((await employeeField.count()) > 0) {
    await employeeField.getByRole('combobox').click()
    const employeeOption = page.getByRole('option').filter({ hasText: /Иванов/ }).first()
    await expect(employeeOption).toBeVisible({ timeout: 10_000 })
    await employeeOption.click()
  }

  await selectFormOption(page, 'Объект', location)
  await selectFormOption(page, 'Тип работ', workType)

  await page.getByRole('button', { name: 'Начать смену' }).click()
  await expect(dialog).toBeHidden({ timeout: 15_000 })
}

/** Wait for Vite PWA service worker (needed for offline shell after hard reload). */
export async function ensureServiceWorkerReady(page: Page) {
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker?.controller),
    null,
    { timeout: 30_000 },
  ).catch(() => undefined)
}

/** Reload while offline — tolerate Chromium net::ERR_INTERNET_DISCONNECTED when SW serves shell. */
export async function reloadWhileOffline(page: Page, fallbackPath = '/worktime') {
  await ensureServiceWorkerReady(page)

  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 })
  } catch {
    // Chromium may throw on offline reload before SW responds.
  }

  const shellVisible = await page
    .getByRole('heading', { name: /Рабочее время|Моя смена|Вход/ })
    .first()
    .isVisible()
    .catch(() => false)

  if (!shellVisible) {
    try {
      await page.goto(fallbackPath, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    } catch {
      // Still offline without SW — caller asserts blank/login fallback.
    }
  }
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
