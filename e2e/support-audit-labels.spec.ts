import { expect, test } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

/**
 * Label-level checks for audit-log filters and support categories.
 * Requires seeded Demo AgroDesk (EMP000) via loginDemoAdmin.
 */
test('история изменений: фильтр действий показывает русские подписи', async ({ page }) => {
  await loginDemoAdmin(page)
  await page.goto('/audit-log')
  await expect(page.getByRole('heading', { name: 'История изменений' })).toBeVisible({
    timeout: 20_000,
  })

  // Default action filter trigger must show localized "Все действия", not raw "all".
  const actionTrigger = page.getByRole('combobox').filter({ hasText: /Все действия|Создание|Изменение|Удаление/ })
  await expect(actionTrigger.first()).toBeVisible()
  await expect(page.getByText('all', { exact: true })).toHaveCount(0)

  await actionTrigger.first().click()
  await expect(page.getByRole('option', { name: 'Все действия' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Создание' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Изменение' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Удаление' })).toBeVisible()
})

test('поддержка: форма нового обращения показывает русские категории', async ({ page }) => {
  await loginDemoAdmin(page)
  await page.goto('/support/new')
  await expect(page.getByRole('heading', { name: 'Новое обращение' })).toBeVisible({
    timeout: 20_000,
  })

  await expect(page.getByText('bug', { exact: true })).toHaveCount(0)
  const category = page.getByRole('combobox').first()
  await expect(category).toContainText(/Ошибка|Доступы|данные|Как работать|Предложение|Другое/i)
})
