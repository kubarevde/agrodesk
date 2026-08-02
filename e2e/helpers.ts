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

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
  if (!token) {
    throw new Error('agrodesk_token отсутствует — сначала выполните loginDemoAdmin')
  }
  return { Authorization: `Bearer ${token}` }
}

/**
 * Close all open shifts via API (no month UI filter).
 * UI cleanup is unsafe: Worktime defaults to current month and can miss older open shifts,
 * leaving EMP001 blocked with HTTP 409 on the next open.
 */
export async function closeAllOpenShifts(page: Page) {
  const headers = await authHeaders(page)
  const list = await page.request.get('/api/shifts?status=open', { headers })
  expect(list.ok(), `GET open shifts failed: ${await list.text()}`).toBeTruthy()
  const opens = (await list.json()) as Array<{ id: string }>

  for (const shift of opens) {
    const closed = await page.request.post(`/api/shifts/${shift.id}/close`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { description: 'e2e cleanup open shift', comment: null },
    })
    expect(
      closed.ok(),
      `POST close ${shift.id} failed: ${await closed.text()}`,
    ).toBeTruthy()
  }
  // No page.reload — full reload races with the next modal interaction in serial e2e.
}

/** Status filter on /worktime — avoid fragile combobox.nth(N). */
export async function selectWorktimeStatusFilter(
  page: Page,
  option: 'Все' | 'Открытые' | 'Закрытые',
) {
  // Filters row: employee + status LabeledSelects (DateRangePicker is not a combobox).
  const triggers = page.locator('[data-slot="select-trigger"]')
  await expect(triggers).toHaveCount(2, { timeout: 10_000 })
  await triggers.nth(1).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

export async function selectFormOption(page: Page, label: string, option: string) {
  const dialog = page.getByRole('dialog').filter({ hasText: /Открыть смену|Начать смену/ })
  const root = (await dialog.count()) > 0 ? dialog.first() : page
  // :has() keeps matching relative to each field block (avoid absolute dialog.locator in `has`).
  const field = root.locator(
    `div.space-y-2:has([data-slot="label"]:text-is("${label}"))`,
  )
  await expect(field).toBeVisible({ timeout: 10_000 })
  await field.getByRole('combobox').click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

export type OpenShiftOptions = {
  /** Skip API cleanup (caller already cleaned while online). */
  skipCleanup?: boolean
  employeeName?: RegExp
}

export async function openShift(
  page: Page,
  location: string,
  workType: string,
  options: OpenShiftOptions = {},
) {
  const online = await page.evaluate(() => navigator.onLine)
  if (!options.skipCleanup && online) {
    await closeAllOpenShifts(page)
  }

  await page.getByRole('button', { name: 'Открыть смену' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Открыть смену/ })
  await expect(dialog).toBeVisible({ timeout: 10_000 })

  await selectFormOption(page, 'Объект', location)
  await selectFormOption(page, 'Тип работ', workType)

  const employeeField = dialog.locator(
    'div.space-y-2:has([data-slot="label"]:text-is("Сотрудник"))',
  )
  if (await employeeField.isVisible().catch(() => false)) {
    // Select employee last — earlier selects can leave Base UI focus in a bad state.
    await employeeField.getByRole('combobox').click()
    const employeeOption = page
      .getByRole('option')
      .filter({ hasText: options.employeeName ?? /EMP001/ })
      .first()
    await expect(employeeOption).toBeVisible({ timeout: 10_000 })
    await employeeOption.click()
    await expect(employeeField.getByRole('combobox')).toContainText(/EMP001/, {
      timeout: 5_000,
    })
  }

  const createWait = online
    ? page.waitForResponse(
        (res) => {
          if (res.request().method() !== 'POST') return false
          const url = res.url()
          if (!url.includes('/api/shifts')) return false
          if (url.includes('/close') || url.includes('/manual')) return false
          return true
        },
        { timeout: 20_000 },
      )
    : null

  await dialog.getByRole('button', { name: 'Начать смену' }).click()

  if (createWait) {
    const createRes = await createWait.catch(async (err: unknown) => {
      const validation = dialog.locator('.text-destructive, [aria-invalid="true"]')
      const toast = page.getByText(/уже есть открытая смена|Не удалось открыть|Выберите|Для полевой/i)
      const bits = [
        (await validation.count()) ? `validation=${await validation.allTextContents()}` : '',
        (await toast.count()) ? `toast=${await toast.first().innerText()}` : '',
        `dialogVisible=${await dialog.isVisible()}`,
      ].filter(Boolean)
      throw new Error(
        `Open shift: no POST /api/shifts within timeout. ${bits.join('; ') || 'no UI error'}. ${String(err)}`,
      )
    })
    if (!createRes.ok()) {
      const body = await createRes.text()
      const toast = page.getByText(/уже есть открытая смена|Не удалось открыть|ошибк/i).first()
      const toastText = (await toast.isVisible().catch(() => false))
        ? await toast.innerText()
        : '(toast not visible)'
      throw new Error(
        `Open shift API ${createRes.status()}: ${body}. UI: ${toastText}`,
      )
    }
  }

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
  }

  const row = page.locator('table tbody tr').filter({ hasText: location })

  for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
    if ((await row.count()) > 0) {
      return row.first()
    }

    const nextButton = page.getByRole('button', { name: 'Вперёд' })
    if (await nextButton.isEnabled()) {
      await nextButton.click()
    } else {
      break
    }
  }

  await expect(row.first()).toBeVisible({ timeout: 10_000 })
  return row.first()
}
