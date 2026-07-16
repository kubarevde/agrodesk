import { expect, test } from '@playwright/test'
import { openShift, findShiftRow, waitForShiftsTable } from './helpers'

test.describe.configure({ mode: 'serial' })

test('открытие и закрытие смены онлайн', async ({ page }) => {
  const location = 'Административный корпус'
  const workType = 'Полив'

  await waitForShiftsTable(page)

  await openShift(page, location, workType)
  await expect(page.getByText('Смена открыта')).toBeVisible()

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
  await expect(page.getByText('Офлайн')).toBeVisible()

  await openShift(page, 'Мастерская', 'Ремонт техники')
  await expect(page.getByText(/Сохранено офлайн/)).toBeVisible()
  await expect(page.locator('header [data-slot="badge"]')).toHaveText('1')

  await context.setOffline(false)
  await expect(page.getByText('Онлайн')).toBeVisible()

  await expect(page.locator('header [data-slot="badge"]')).toHaveCount(0, { timeout: 5_000 })
})

test('холодный перезапуск офлайн сохраняет сессию', async ({ page, context }) => {
  await waitForShiftsTable(page)
  await expect(page.getByText('Онлайн')).toBeVisible()

  // Ensure profile is cached via successful online session
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Рабочее время' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Офлайн')).toBeVisible()
  await expect(page.getByText(/Нет сети — режим офлайн/)).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
})

test('офлайн-запись переживает reload до синхронизации', async ({ page, context }) => {
  await waitForShiftsTable(page)

  await context.setOffline(true)
  await openShift(page, 'Зернохранилище', 'Погрузка')
  await expect(page.getByText(/Сохранено офлайн/)).toBeVisible()
  await expect(page.locator('header [data-slot="badge"]')).toHaveText('1')

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByText('Офлайн')).toBeVisible()
  await expect(page.locator('header [data-slot="badge"]')).toHaveText('1', { timeout: 10_000 })
  await expect(page.getByText('Зернохранилище').first()).toBeVisible()
})

test('дашборд офлайн показывает честный online-only state', async ({ page, context }) => {
  await waitForShiftsTable(page)
  await context.setOffline(true)
  await page.goto('/dashboard')
  await expect(page.getByText(/Дашборд доступен только онлайн|Показаны последние загруженные/)).toBeVisible({
    timeout: 10_000,
  })
  await expect(page).not.toHaveURL(/\/login/)
})

test('фильтрация таблицы смен', async ({ page }) => {
  await waitForShiftsTable(page)

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
