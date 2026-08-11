import { expect, test } from '@playwright/test'
import { loginDemoAdmin } from './helpers'

/**
 * Smoke + finance UX: Employees → Оплата труда.
 * Full accrual→confirm→payout chain is covered by backend pytest on an up-to-date API.
 */
test.describe('Payroll labor UI', () => {
  test('salary tabs, Russian labels, no raw enums in payouts', async ({ page }) => {
    test.setTimeout(90_000)
    await loginDemoAdmin(page)

    await page.goto('/employees?tab=salary&payroll=accruals')
    await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Справка: начисления')).toBeVisible()

    for (const label of [
      'Начисления',
      'Выдача ЗП',
      'Ставки и схемы',
      'Контроль и отчётность',
    ]) {
      await expect(
        page.getByRole('tab', { name: label }).or(page.getByText(label, { exact: true })).first(),
      ).toBeVisible()
    }

    // Accruals list should still show drafts after visiting payouts (cache key isolation).
    await page.getByText('Выдача ЗП', { exact: true }).first().click()
    await expect(page.getByText('Справка: выдача ЗП')).toBeVisible()
    await expect(page.getByText(/payroll run/i)).toHaveCount(0)
    await expect(page.getByText(/\b(hourly|monthly|per_shift|piecework)\b/i)).toHaveCount(0)
    await expect(page.getByText(/\b(confirmed|draft|paid)\b/)).toHaveCount(0)

    await page.getByText('Начисления', { exact: true }).first().click()
    await expect(page.getByText('Справка: начисления')).toBeVisible()

    const openBtn = page.getByRole('button', { name: /Открыть|Детали/i }).first()
    if (await openBtn.isVisible().catch(() => false)) {
      await openBtn.click()
      const recalc = page.getByRole('button', { name: 'Пересчитать' }).first()
      if (await recalc.isEnabled().catch(() => false)) {
        await recalc.click()
        await expect(page.getByText('Пересчитать начисление?')).toBeVisible()
        await expect(page.getByText(/Ручные корректировки|премии, штрафы/i)).toBeVisible()
        await page.getByRole('button', { name: 'Отмена' }).click()
      }
    }

    await page.getByText('Ставки и схемы', { exact: true }).first().click()
    await expect(page.getByText('Справка: ставки и схемы')).toBeVisible()

    await page.getByText('Контроль и отчётность', { exact: true }).first().click()
    await expect(page.getByText('Справка: контроль и отчётность')).toBeVisible()
    // KPI CardTitle (exact) — avoid matching collapsed help copy «Начислено».
    await expect(page.getByText('Начислено', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    })

    // Open employee detail via API id (row click can miss handlers under tab layout).
    const token = await page.evaluate(() => localStorage.getItem('agrodesk_token'))
    expect(token).toBeTruthy()
    const empsRes = await page.request.get('/api/employees', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(empsRes.ok(), await empsRes.text()).toBeTruthy()
    const emps = (await empsRes.json()) as Array<{ id: string }>
    expect(emps.length).toBeGreaterThan(0)
    await page.goto(`/employees/${emps[0].id}`)
    await expect(page).toHaveURL(/\/employees\/[0-9a-f-]{8,}/i, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: /К списку сотрудников/i })).toBeVisible()
  })
})
