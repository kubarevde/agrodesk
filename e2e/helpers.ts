import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** QA API base for Playwright request (bypass Vite). Default :8001 — never stale :8000. */
export const API =
  process.env.VITE_API_PROXY_TARGET ||
  process.env.VITE_API_URL ||
  'http://127.0.0.1:8001'

type PublicOrg = {
  id: string
  name: string
  slug: string
  region?: string | null
}

async function fetchDemoOrg(page: Page): Promise<PublicOrg> {
  const res = await page.request.get(`${API}/api/auth/orgs`)
  expect(
    res.ok(),
    `GET ${API}/api/auth/orgs failed: ${await res.text()}. Check VITE_API_PROXY_TARGET (QA :8001).`,
  ).toBeTruthy()
  const orgs = (await res.json()) as PublicOrg[]
  const demo = orgs.find((org) => /Demo AgroDesk/i.test(org.name))
  if (!demo) {
    throw new Error(
      `Demo AgroDesk missing in orgs from ${API}. ` +
        `Got: ${orgs.map((o) => o.name).join(', ') || '(empty)'}. Re-seed agrodesk_qa.`,
    )
  }
  return demo
}

/**
 * API-first session (same pattern as marketplace loginOrgAdmin).
 * UI form login flakes under parallel e2e; inject token + selected_org instead.
 */
async function injectDemoSession(page: Page, email: string, password: string) {
  const org = await fetchDemoOrg(page)
  const res = await page.request.post(`${API}/api/auth/login`, {
    data: { email, password, org_id: org.id },
  })
  expect(
    res.ok(),
    `POST ${API}/api/auth/login failed for ${email}: ${await res.text()}`,
  ).toBeTruthy()
  const body = (await res.json()) as { access_token: string }

  await page.goto('/login')
  await page.evaluate(
    ({ token, selectedOrg }) => {
      localStorage.setItem('agrodesk_token', token)
      localStorage.setItem('selected_org', JSON.stringify(selectedOrg))
    },
    {
      token: body.access_token,
      selectedOrg: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        region: org.region ?? null,
      },
    },
  )
  await gotoPath(page, '/dashboard')
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
}

/** Demo org admin — requires seeded API (EMP000 / 1234). */
export async function loginDemoAdmin(page: Page) {
  await injectDemoSession(page, 'EMP000', '1234')
}

/** Demo employee (EMP001) — messenger / non-admin flows. */
export async function loginDemoEmployee(page: Page, code = 'EMP001') {
  await injectDemoSession(page, code, '1234')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * UI form login smoke only — prefer loginDemoAdmin elsewhere.
 * Exercises org picker + credentials against QA proxy.
 */
export async function loginDemoAdminViaUi(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // ignore
    }
  })
  await page.goto('/login')
  if (!page.url().includes('/login')) {
    return
  }

  if (!(await page.locator('#email').isVisible().catch(() => false))) {
    const demo = page.getByRole('option', { name: /Demo AgroDesk/i })
    await expect(
      demo,
      `Demo AgroDesk not visible. Proxy target ${API} must be QA :8001.`,
    ).toBeVisible({ timeout: 20_000 })
    await demo.click()
    await expect(demo).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 })
    const continueBtn = page.getByRole('button', { name: 'Продолжить' })
    await expect(continueBtn).toBeEnabled({ timeout: 15_000 })
    await continueBtn.click()
  }

  await page.locator('#email').waitFor({ timeout: 10_000 })
  await page.locator('#email').fill('EMP000')
  await page.locator('#password').fill('1234')
  await page.getByRole('button', { name: /Войти/i }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 })
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
      const message = error instanceof Error ? error.message : String(error)
      // Vite HMR can abort navigation mid-flight; brief pause then retry.
      if (!/ERR_ABORTED|interrupted/i.test(message)) {
        throw error
      }
      await page.waitForTimeout(400)
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

/**
 * QA often only has «Полевая работа» → open-shift requires a field.
 * Fields are Dexie-backed; must fetch while online before setOffline.
 */
export async function warmShiftOfflineCache(page: Page) {
  await page.goto('/fields', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /Поля/i })).toBeVisible({ timeout: 20_000 })
  await expect
    .poll(async () => page.locator('[data-testid="field-card"], table tbody tr, a[href*="/fields/"]').count(), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0)

  await page.goto('/worktime', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Рабочее время' })).toBeVisible({
    timeout: 15_000,
  })
  await page.getByRole('button', { name: 'Открыть смену' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Открыть смену/ })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(async () => dialog.getByRole('combobox').count(), { timeout: 20_000 })
    .toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden({ timeout: 10_000 })
}

/** Click a listbox option without waiting on in-flight SPA navigations. */
async function clickListboxOption(page: Page, match: RegExp | string) {
  const source = typeof match === 'string' ? match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : match.source
  const flags = typeof match === 'string' ? 'i' : match.flags.includes('i') ? match.flags : `${match.flags}i`
  await expect
    .poll(
      async () =>
        page.evaluate(
          ({ source: reSource, flags: reFlags }) => {
            const re = new RegExp(reSource, reFlags)
            return [...document.querySelectorAll('[role="option"]')].some((el) => {
              if (!re.test(el.textContent ?? '')) return false
              const rect = el.getBoundingClientRect()
              return rect.width > 0 && rect.height > 0
            })
          },
          { source, flags },
        ),
      { timeout: 15_000 },
    )
    .toBeTruthy()

  const clicked = await page.evaluate(
    ({ source: reSource, flags: reFlags }) => {
      const re = new RegExp(reSource, reFlags)
      const opt = [...document.querySelectorAll('[role="option"]')].find((el) => {
        if (!re.test(el.textContent ?? '')) return false
        const rect = el.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      }) as HTMLElement | undefined
      if (!opt) return false
      opt.click()
      return true
    },
    { source, flags },
  )
  expect(clicked, `listbox option ${String(match)}`).toBeTruthy()
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
  const combo = field.getByRole('combobox')
  await expect(combo).toBeVisible({ timeout: 15_000 })
  await combo.click({ force: true })
  await clickListboxOption(page, option)
  await expect(combo).toContainText(option, { timeout: 5_000 })
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
): Promise<string> {
  const online = await page.evaluate(() => navigator.onLine)
  if (!options.skipCleanup && online) {
    await closeAllOpenShifts(page)
  }

  await page.getByRole('button', { name: 'Открыть смену' }).first().click()
  const dialog = page.getByRole('dialog', { name: /Открыть смену/ })
  await expect(dialog).toBeVisible({ timeout: 10_000 })

  // Skeletons while locations/employees load — wait until at least one combobox exists.
  await expect
    .poll(async () => dialog.getByRole('combobox').count(), { timeout: 20_000 })
    .toBeGreaterThan(0)

  const employeeField = dialog.locator(
    'div.space-y-2:has([data-slot="label"]:text-is("Сотрудник"))',
  )
  if (await employeeField.isVisible().catch(() => false)) {
    const empCombo = employeeField.getByRole('combobox')
    await empCombo.click({ force: true })
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 })
    await clickListboxOption(page, options.employeeName ?? /EMP001/)
    await expect(empCombo).toContainText(/EMP001/, { timeout: 5_000 })
  }

  // Work type first: field-work types auto-lock location to «Полевая работа» and require a field.
  await selectFormOption(page, 'Тип работ', workType)

  let resolvedLocation = location
  const fieldBlock = dialog.locator('div.space-y-2').filter({ hasText: /^Поле/ })
  const locationCombo = dialog
    .locator('div.space-y-2:has([data-slot="label"]:text-is("Объект"))')
    .getByRole('combobox')

  if (await locationCombo.isVisible().catch(() => false)) {
    await locationCombo.click({ force: true })
    const opts = page.getByRole('option')
    await expect(opts.first()).toBeVisible({ timeout: 15_000 })
    const count = await opts.count()
    let picked = false
    // Prefer workshop-like locations when present.
    for (const prefer of [location, 'Мастерская']) {
      for (let i = 0; i < count; i += 1) {
        const text = ((await opts.nth(i).textContent()) ?? '').trim()
        if (/Полевая\s*работа/i.test(text)) continue
        if (text.toLowerCase().includes(prefer.toLowerCase())) {
          await clickListboxOption(page, text)
          resolvedLocation = text
          picked = true
          break
        }
      }
      if (picked) break
    }
    if (!picked) {
      for (let i = 0; i < count; i += 1) {
        const text = ((await opts.nth(i).textContent()) ?? '').trim()
        if (/Полевая\s*работа/i.test(text)) continue
        await clickListboxOption(page, text)
        resolvedLocation = text
        picked = true
        break
      }
    }
    // QA seed may only expose system «Полевая работа» — then a field is required.
    if (!picked) {
      const text = ((await opts.first().textContent()) ?? '').trim()
      await clickListboxOption(page, text || /Полевая/)
      resolvedLocation = text || 'Полевая работа'
      picked = true
    }
  } else {
    // Locked field-work location label.
    const locked = dialog.locator('div.space-y-2:has([data-slot="label"]:text-is("Объект"))')
    const lockedText = ((await locked.innerText().catch(() => '')) ?? '').trim()
    if (/Полевая/i.test(lockedText)) resolvedLocation = 'Полевая работа'
  }

  // Wait for field select when location is field-work (required).
  const fieldCombo = fieldBlock.getByRole('combobox')
  await fieldCombo.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined)
  if (await fieldCombo.isVisible().catch(() => false)) {
    await fieldCombo.click({ force: true })
    await expect(page.getByRole('option').first(), 'field options for open-shift').toBeVisible({
      timeout: 15_000,
    })
    const fieldText = ((await page.getByRole('option').first().textContent()) ?? '').trim()
    await clickListboxOption(page, fieldText || /./)
  }

  // Ensure required fields are filled before submit (avoid silent RHF block).
  await expect(dialog.getByRole('button', { name: 'Начать смену' })).toBeEnabled()
  await expect(dialog.locator('.text-destructive')).toHaveCount(0)

  if (online) {
    const [createRes] = await Promise.all([
      page.waitForResponse(
        (res) => {
          if (res.request().method() !== 'POST') return false
          const url = res.url()
          if (!url.includes('/api/shifts')) return false
          if (url.includes('/close') || url.includes('/manual')) return false
          return true
        },
        { timeout: 20_000 },
      ),
      dialog.getByRole('button', { name: 'Начать смену' }).click(),
    ]).catch(async (err: unknown) => {
      const validation = dialog.locator('.text-destructive, [aria-invalid="true"]')
      const toast = page.getByText(/уже есть открытая смена|Не удалось открыть|Выберите|Для полевой/i)
      const bits = [
        (await validation.count()) ? `validation=${await validation.allTextContents()}` : '',
        (await toast.count()) ? `toast=${await toast.first().innerText()}` : '',
        `dialogVisible=${await dialog.isVisible()}`,
        `url=${page.url()}`,
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
  } else {
    await dialog.getByRole('button', { name: 'Начать смену' }).click()
  }

  await expect(dialog).toBeHidden({ timeout: 15_000 })
  return resolvedLocation
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
    .getByRole('heading', { name: /Рабочее время|Рабочее место|Моя смена|Вход/ })
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

export async function findShiftRow(
  page: Page,
  location: string,
  options: {
    status?: 'Открыта' | 'Закрыта'
    workType?: string
    employee?: string | RegExp
  } = {},
): Promise<Locator> {
  const backButton = page.getByRole('button', { name: 'Назад' })
  while (await backButton.isEnabled()) {
    await backButton.click()
  }

  let row = page.locator('table tbody tr').filter({ hasText: location })
  if (options.status) {
    row = row.filter({ hasText: options.status })
  }
  if (options.workType) {
    row = row.filter({ hasText: options.workType })
  }
  if (options.employee) {
    row = row.filter({ hasText: options.employee })
  }

  for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
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
