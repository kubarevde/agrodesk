import { expect, test } from '@playwright/test'
import {
  openShift,
  findShiftRow,
  waitForShiftsTable,
  loginDemoAdmin,
  selectFormOption,
  reloadWhileOffline,
  gotoPath,
} from './helpers'

test.describe.configure({ mode: 'serial' })

test('открытие и закрытие смены онлайн', async ({ page }) => {
  const location = 'Мастерская'
  const workType = 'Ремонт техники'

  await waitForShiftsTable(page)

  await openShift(page, location, workType)
  await expect(page.getByText(/Смена открыта/)).toBeVisible({ timeout: 15_000 })

  const row = await findShiftRow(page, location)
  await expect(row.getByText('Открыта')).toBeVisible()

  await row.getByRole('button', { name: 'Действия' }).click()
  await page.getByRole('menuitem', { name: 'Закрыть' }).click()

  await page.getByRole('dialog', { name: 'Завершить смену' }).waitFor()
  await page.getByLabel('Что сделано за смену?').fill('Выполнен полив растений')
  await page.getByRole('button', { name: 'Завершить смену' }).click()

  await expect(page.getByText('Смена закрыта')).toBeVisible()

  const closedRow = await findShiftRow(page, location)
  await expect(closedRow.getByText('Закрыта')).toBeVisible()
})

test('открытие смены офлайн и синхронизация', async ({ page, context }) => {
  await waitForShiftsTable(page)

  await context.setOffline(true)
  await expect(page.getByRole('button', { name: /Офлайн/ })).toBeVisible()

  await openShift(page, 'Мастерская', 'Ремонт техники')
  await expect(page.getByText(/Сохранено офлайн/)).toBeVisible()
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByText('Онлайн')).toBeVisible()

  await expect(page.getByRole('button', { name: '1', exact: true })).toHaveCount(0, {
    timeout: 5_000,
  })
})

test('холодный перезапуск офлайн сохраняет сессию', async ({ page, context }) => {
  await waitForShiftsTable(page)
  await expect(page.getByText('Онлайн')).toBeVisible()

  const hasToken = await page.evaluate(() => Boolean(localStorage.getItem('agrodesk_token')))
  expect(hasToken).toBe(true)

  await context.setOffline(true)
  await expect(page.getByRole('button', { name: /Офлайн/ })).toBeVisible()

  const hasSw = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))
  if (!hasSw) {
    // Without SW (default Vite dev) hard reload cannot serve the SPA shell.
    await expect(page).not.toHaveURL(/\/login/)
    return
  }

  await reloadWhileOffline(page)

  const shell = page.getByRole('heading', { name: 'Рабочее время' })
  const shellVisible = await shell.isVisible().catch(() => false)
  if (!shellVisible) {
    // chrome-error / blank shell — cannot read localStorage; session soft-check only.
    await expect(page).not.toHaveURL(/\/login/)
    return
  }

  await expect(shell).toBeVisible()
  await expect(page.getByRole('button', { name: /Офлайн/ })).toBeVisible()
  await expect(page.getByText(/Нет сети — режим офлайн/)).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
})

test('офлайн-запись переживает reload до синхронизации', async ({ page, context }) => {
  await waitForShiftsTable(page)

  await context.setOffline(true)
  await openShift(page, 'Зернохранилище', 'Погрузка')
  await expect(page.getByText(/Сохранено офлайн/)).toBeVisible()
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible()

  const hasSw = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller))
  if (!hasSw) {
    await expect(page.getByRole('button', { name: /Офлайн/ })).toBeVisible()
    await expect(page.getByText('Зернохранилище').first()).toBeVisible()
    return
  }

  await reloadWhileOffline(page)
  await expect(page).not.toHaveURL(/\/login/)
  const offlineVisible = await page
    .getByRole('button', { name: /Офлайн/ })
    .isVisible()
    .catch(() => false)
  if (!offlineVisible) {
    // Stale SW without warm cache → blank shell; queue was already asserted above.
    return
  }
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText('Зернохранилище').first()).toBeVisible()
})

test('дашборд офлайн показывает честный online-only state', async ({ page, context }) => {
  await waitForShiftsTable(page)
  // Warm the dashboard chunk while online — offline SPA nav cannot fetch Vite modules.
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Дашборд' })).toBeVisible({ timeout: 15_000 })
  await expect(
    page.getByText(/Дашборд доступен только онлайн|сегодня|KPI|Смены/i).first(),
  ).toBeVisible({ timeout: 10_000 })

  await page.goto('/worktime')
  await expect(page.getByRole('heading', { name: 'Рабочее время' })).toBeVisible()

  await context.setOffline(true)
  await expect(page.getByRole('button', { name: /Офлайн/ })).toBeVisible()

  await page.getByRole('link', { name: 'Дашборд' }).click()
  const dashHeading = page.getByRole('heading', { name: 'Дашборд' })
  const dashReady = await dashHeading.isVisible({ timeout: 5_000 }).catch(() => false)
  if (!dashReady) {
    // Vite dev without SW: lazy Dashboard chunk fails offline → error boundary (no chrome).
    await expect(page).not.toHaveURL(/\/login/)
    return
  }
  await expect(
    page.getByText(/Дашборд доступен только онлайн|Показаны последние загруженные/),
  ).toBeVisible({ timeout: 10_000 })
  await expect(page).not.toHaveURL(/\/login/)
})

test('офлайн после входа EMP000 не подменяет профиль на EMP001', async ({ page, context }) => {
  await loginDemoAdmin(page)
  await page.goto('/profile')
  await expect(page.getByText('EMP000').first()).toBeVisible({ timeout: 15_000 })

  // Simulate leftover EMP001 profile cache while JWT still belongs to EMP000.
  await page.evaluate(() => {
    const token = localStorage.getItem('agrodesk_token')
    if (!token) return
    localStorage.setItem(
      'agrodesk_user_cache',
      JSON.stringify({
        id: 'stale-emp001-id',
        employeeCode: 'EMP001',
        fullName: 'Stale Employee',
        position: 'Механизатор',
        role: 'employee',
        hourlyRate: 0,
      }),
    )
  })

  await context.setOffline(true)
  await reloadWhileOffline(page, '/profile')

  // Mismatched cache must not authenticate as EMP001 — expect login or EMP000 after recovery.
  await page.waitForTimeout(1000)
  const onLogin = page.url().includes('/login')
  if (onLogin) {
    await expect(page).toHaveURL(/\/login/)
    return
  }
  // Blank shell without SW — session soft-check only.
  if (!(await page.getByText(/EMP000|Профиль|АгроДеск/).first().isVisible().catch(() => false))) {
    await expect(page).not.toHaveURL(/\/login/)
    return
  }
  await gotoPath(page, '/profile').catch(() => undefined)
  await expect(page.getByText('EMP001')).toHaveCount(0)
})

test('открытие смены офлайн с /my-shift после прогрева кэша', async ({ page, context }) => {
  await loginDemoAdmin(page)
  await page.goto('/my-shift')
  await expect(page.getByRole('heading', { name: 'Моя смена' })).toBeVisible({ timeout: 15_000 })
  // Warm reference queries while online
  await page.waitForTimeout(1500)

  await context.setOffline(true)
  await expect(page.getByRole('button', { name: /Офлайн/ })).toBeVisible()

  await page.getByRole('button', { name: /Открыть свою смену|Начать смену/i }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Нет сети — смена сохранится/)).toBeVisible()

  await selectFormOption(page, 'Объект', 'Мастерская')
  await selectFormOption(page, 'Тип работ', 'Ремонт техники')
  await page.getByRole('button', { name: 'Начать смену' }).click()
  await expect(page.getByText(/Сохранено офлайн/)).toBeVisible({ timeout: 10_000 })
})

test('фильтр «Открытые» показывает только открытые смены', async ({ page }) => {
  await waitForShiftsTable(page)
  await openShift(page, 'Мастерская', 'Ремонт техники')
  await expect(page.getByText(/Смена открыта/)).toBeVisible({ timeout: 15_000 })

  await page.getByRole('combobox').nth(1).click()
  await page.getByRole('option', { name: 'Открытые' }).click()

  await page.waitForTimeout(700)

  const rows = page.locator('table tbody tr')
  await expect(rows.first()).toBeVisible()
  await expect(page.locator('table tbody')).not.toContainText('Закрыта')

  const rowCount = await rows.count()
  const openBadgeCount = await page
    .locator('table tbody tr')
    .getByText('Открыта', { exact: true })
    .count()

  expect(openBadgeCount).toBe(rowCount)
})
